import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import { isIP } from "node:net";
import type { SeoCheckConfig } from "./config.ts";
import { isPublicIp, stripIpHost, validateUrl } from "./network-policy.ts";

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

export interface DnsResolver {
  lookup(hostname: string): Promise<ResolvedAddress[]>;
}

export interface ConnectorRequest {
  target: URL;
  pinnedAddress: string;
  pinnedFamily: 4 | 6;
  headers: Record<string, string>;
  signal: AbortSignal;
  maxRawBytes: number;
}

export interface ConnectorResult {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array;
  truncated: boolean;
}

export interface PageConnector {
  request(input: ConnectorRequest): Promise<ConnectorResult>;
}

export type PageFetchResult =
  | {
      type: "document";
      kind: "html" | "too_large" | "non_html";
      finalUrl: string;
      redirectCount: number;
      httpStatus: number;
      headers: Record<string, string>;
      html: string | null;
      contentType: string | null;
    }
  | {
      type: "access_restricted" | "http_error";
      finalUrl: string;
      redirectCount: number;
      httpStatus: number;
    }
  | {
      type: "timeout" | "network" | "tls" | "dns" | "too_many_redirects";
      redirectCount: number;
    }
  | { type: "blocked"; redirectCount: number };

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export function buildOutboundHeaders(config: Pick<SeoCheckConfig, "userAgent">, target: URL): Record<string, string> {
  return {
    host: target.host,
    "user-agent": config.userAgent,
    accept: "text/html,application/xhtml+xml;q=0.9",
    "accept-language": "en",
    "accept-encoding": "gzip, deflate, br",
    connection: "close",
  };
}

export function classifyTransportError(error: unknown): "timeout" | "tls" | "dns" | "network" {
  const err = error as { name?: string; code?: string };
  const code = err.code ?? "";
  if (err.name === "AbortError" || code === "ABORT_ERR" || code === "ECONNABORTED" || code === "ETIMEDOUT") {
    return "timeout";
  }
  if (
    code.startsWith("ERR_TLS") ||
    code.startsWith("ERR_SSL") ||
    code.includes("CERT") ||
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    code === "DEPTH_ZERO_SELF_SIGNED_CERT"
  ) {
    return "tls";
  }
  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "DNS") return "dns";
  return "network";
}

export async function fetchPage(options: {
  url: URL;
  resolver: DnsResolver;
  connector: PageConnector;
  config: Pick<SeoCheckConfig, "maxRedirects" | "timeoutMs" | "maxBytes" | "maxRawBytes" | "userAgent">;
  now: () => number;
}): Promise<PageFetchResult> {
  const deadline = options.now() + options.config.timeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, options.config.timeoutMs));
  let current = options.url;
  let redirectCount = 0;
  const seen = new Set<string>();

  try {
    while (true) {
      if (options.config.timeoutMs <= 0 || options.now() >= deadline || controller.signal.aborted) {
        return { type: "timeout", redirectCount };
      }
      const policy = validateUrl(current);
      if (!policy.ok) return { type: "blocked", redirectCount };
      current = policy.url;
      if (seen.has(policy.normalized)) return { type: "too_many_redirects", redirectCount };
      seen.add(policy.normalized);

      const resolved = await resolvePinned(policy.url, options.resolver, controller.signal);
      if (resolved.type === "timeout" || controller.signal.aborted || options.now() >= deadline) {
        return { type: "timeout", redirectCount };
      }
      if (resolved.type !== "addresses") {
        return resolved.type === "blocked"
          ? { type: "blocked", redirectCount }
          : { type: "dns", redirectCount };
      }

      let response: ConnectorResult;
      try {
        response = await options.connector.request({
          target: policy.url,
          pinnedAddress: resolved.pin.address,
          pinnedFamily: resolved.pin.family,
          headers: buildOutboundHeaders(options.config, policy.url),
          signal: controller.signal,
          maxRawBytes: options.config.maxRawBytes,
        });
      } catch (error) {
        const kind = classifyTransportError(error);
        return { type: kind, redirectCount };
      }

      const headers = normalizeHeaders(response.headers);
      if (REDIRECT_STATUSES.has(response.status)) {
        if (redirectCount >= options.config.maxRedirects) {
          return { type: "too_many_redirects", redirectCount };
        }
        const location = headers.location;
        if (!location || location.length > 2048) {
          return { type: "http_error", finalUrl: policy.normalized, redirectCount, httpStatus: response.status };
        }
        let next: URL;
        try {
          next = new URL(location, policy.url);
        } catch {
          return { type: "blocked", redirectCount };
        }
        next.hash = "";
        redirectCount += 1;
        current = next;
        continue;
      }

      return await classifyResponse(response, headers, policy.normalized, redirectCount, options.config);
    }
  } finally {
    clearTimeout(timer);
  }
}

async function resolvePinned(
  url: URL,
  resolver: DnsResolver,
  signal: AbortSignal,
): Promise<{ type: "addresses"; pin: ResolvedAddress } | { type: "blocked" | "dns" | "timeout" }> {
  const host = stripIpHost(url.hostname);
  let addresses: ResolvedAddress[];
  if (isIP(host)) {
    addresses = [{ address: host, family: isIP(host) === 6 ? 6 : 4 }];
  } else {
    try {
      addresses = await awaitWithAbort(resolver.lookup(host), signal);
    } catch {
      return { type: signal.aborted ? "timeout" : "dns" };
    }
  }
  if (addresses.length === 0) return { type: "dns" };
  if (addresses.some((item) => !isPublicIp(item.address))) return { type: "blocked" };
  const pin = addresses.find((item) => item.family === 4) ?? addresses[0];
  if (!pin || !isPublicIp(pin.address)) return { type: "blocked" };
  return { type: "addresses", pin };
}

function awaitWithAbort<T>(pending: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    pending.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
    if (signal.aborted) onAbort();
  });
}

async function classifyResponse(
  response: ConnectorResult,
  headers: Record<string, string>,
  finalUrl: string,
  redirectCount: number,
  config: Pick<SeoCheckConfig, "maxBytes" | "maxRawBytes">,
): Promise<PageFetchResult> {
  if (response.status === 401 || response.status === 403 || response.status === 407 || response.status === 429) {
    return { type: "access_restricted", finalUrl, redirectCount, httpStatus: response.status };
  }
  if (response.truncated || declaredTooLarge(headers, config)) {
    return {
      type: "document",
      kind: "too_large",
      finalUrl,
      redirectCount,
      httpStatus: response.status,
      headers,
      html: null,
      contentType: mediaType(headers["content-type"]),
    };
  }
  if (response.status !== 200 && response.status !== 203) {
    if (response.status === 503 && isChallenge(response.status, headers, null)) {
      return { type: "access_restricted", finalUrl, redirectCount, httpStatus: response.status };
    }
    return { type: "http_error", finalUrl, redirectCount, httpStatus: response.status };
  }

  const inflated = await inflateLimited(response.body, headers["content-encoding"] ?? "", config.maxBytes);
  if (inflated === "too_large") {
    return {
      type: "document",
      kind: "too_large",
      finalUrl,
      redirectCount,
      httpStatus: response.status,
      headers,
      html: null,
      contentType: mediaType(headers["content-type"]),
    };
  }
  if (inflated === "error") return { type: "network", redirectCount };

  const contentType = headers["content-type"] ?? "";
  const html = decodeBody(inflated, contentType);
  if (isChallenge(response.status, headers, html)) {
    return { type: "access_restricted", finalUrl, redirectCount, httpStatus: response.status };
  }
  const type = mediaType(contentType);
  const htmlType = type === "text/html" || type === "application/xhtml+xml" || (type === "" || type === "application/octet-stream") && looksLikeHtml(html);
  if (!htmlType) {
    return {
      type: "document",
      kind: "non_html",
      finalUrl,
      redirectCount,
      httpStatus: response.status,
      headers,
      html: null,
      contentType: type || null,
    };
  }
  return {
    type: "document",
    kind: "html",
    finalUrl,
    redirectCount,
    httpStatus: response.status,
    headers,
    html,
    contentType: type || "text/html",
  };
}

function declaredTooLarge(headers: Record<string, string>, config: Pick<SeoCheckConfig, "maxBytes" | "maxRawBytes">): boolean {
  const length = Number(headers["content-length"] ?? "");
  if (!Number.isFinite(length)) return false;
  if (length > config.maxRawBytes) return true;
  const encoding = (headers["content-encoding"] ?? "").trim().toLowerCase();
  return (encoding === "" || encoding === "identity") && length > config.maxBytes;
}

function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const name = key.toLowerCase();
    if (name === "set-cookie" || name === "cookie" || name === "authorization") continue;
    out[name] = out[name] ? `${out[name]}, ${value}` : value;
  }
  return out;
}

function mediaType(contentType: string | undefined): string {
  return (contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
}

function looksLikeHtml(body: string): boolean {
  const head = body.slice(0, 512).trimStart().toLowerCase();
  return head.startsWith("<!doctype html") || head.startsWith("<html") || head.startsWith("<head") || head.startsWith("<body");
}

function isChallenge(status: number, headers: Record<string, string>, html: string | null): boolean {
  const mitigated = headers["cf-mitigated"];
  if (mitigated && mitigated.toLowerCase() !== "none") return true;
  if (!html) return false;
  const sample = html.slice(0, 4000).toLowerCase();
  const strong = [
    "/cdn-cgi/challenge-platform",
    "cf-challenge",
    "just a moment",
    "attention required",
    "verify you are human",
    "checking your browser",
  ];
  if (!strong.some((marker) => sample.includes(marker))) return false;
  if (status === 503 || status === 403 || status === 429) return true;
  const text = sample
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length < 280;
}

function decodeBody(body: Uint8Array, contentType: string): string {
  const charset = /charset=([^;]+)/i.exec(contentType)?.[1]?.trim().replace(/["']/g, "").toLowerCase() ?? "utf-8";
  const label = charset === "iso-8859-1" || charset === "latin1" || charset === "windows-1252" || charset === "utf-8" || charset === "us-ascii"
    ? charset
    : "utf-8";
  try {
    return new TextDecoder(label, { fatal: false }).decode(body);
  } catch {
    return new TextDecoder("utf-8", { fatal: false }).decode(body);
  }
}

async function inflateLimited(body: Uint8Array, encoding: string, maxBytes: number): Promise<Uint8Array | "too_large" | "error"> {
  const normalized = encoding.trim().toLowerCase();
  if (normalized === "" || normalized === "identity") {
    return body.byteLength > maxBytes ? "too_large" : body;
  }
  if (normalized.includes(",")) return "error";
  const stream = normalized === "gzip" || normalized === "x-gzip"
    ? createGunzip()
    : normalized === "deflate"
      ? createInflate()
      : normalized === "br"
        ? createBrotliDecompress()
        : null;
  if (!stream) return "error";
  return await new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;
    const finish = (value: Uint8Array | "too_large" | "error") => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    stream.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        stream.destroy();
        finish("too_large");
        return;
      }
      chunks.push(chunk);
    });
    stream.on("end", () => finish(Buffer.concat(chunks)));
    stream.on("error", () => finish("error"));
    stream.end(Buffer.from(body));
  });
}
