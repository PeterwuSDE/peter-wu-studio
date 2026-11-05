import { isIP } from "node:net";
import { configFromEnv, DEFAULT_CONFIG, type SeoCheckConfig } from "./config.ts";
import { httpStatusFor, type SeoCheckResponse } from "./contract.ts";
import { methodMessage } from "./messages.ts";
import { getNodeConnector, getNodeResolver } from "./node-transport.ts";
import { errorResponse } from "./render.ts";
import { runSeoCheck, type SeoCheckDeps } from "./service.ts";

const MAX_BODY_BYTES = 16 * 1024;

export function clientAddress(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim() ?? "";
  if (isIP(real)) return real;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim() ?? "";
    if (isIP(first)) return first;
  }
  return "unknown";
}

export async function handleSeoCheckRequest(request: Request, deps: SeoCheckDeps = {}): Promise<Response> {
  const config = { ...DEFAULT_CONFIG, ...deps.config };
  if (request.method === "OPTIONS") return applyCors(new Response(null, { status: 204 }), request, config);
  if (request.method !== "POST") {
    return applyCors(json(errorResponse({
      locale: "en",
      requestId: "",
      status: "invalid_request",
      code: "method_not_allowed",
      message: methodMessage("en"),
    }), 405), request, config);
  }

  let payload: unknown;
  try {
    payload = await readJsonLimited(request);
  } catch {
    return applyCors(json(errorResponse({
      locale: "en",
      requestId: "",
      status: "invalid_request",
      code: "invalid_request",
      message: "The request is not valid. Provide a page URL and a request id.",
    }), 400), request, config);
  }

  const record = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  try {
    const result = await runSeoCheck(
      {
        url: record?.url,
        locale: record?.locale,
        requestId: record?.requestId,
        clientIp: clientAddress(request),
      },
      {
        ...deps,
        config,
        resolver: deps.resolver ?? getNodeResolver(),
        connector: deps.connector ?? getNodeConnector(),
      },
    );
    return applyCors(json(result.body, result.httpStatus), request, config);
  } catch {
    const locale = record?.locale === "zh" || (typeof record?.locale === "string" && record.locale.startsWith("zh-")) ? "zh" : "en";
    return applyCors(json(errorResponse({
      locale,
      requestId: typeof record?.requestId === "string" ? record.requestId.slice(0, 80) : "",
      status: "unavailable",
      code: "internal_error",
      message: locale === "zh"
        ? "免费检查暂时不可用。本次未返回成功报告，请稍后重试或联系 Northline。"
        : "The free check is temporarily unavailable. No successful report was returned. Try again later or contact Northline.",
    }), 503), request, config);
  }
}

export function applyCors(response: Response, request: Request, config: Pick<SeoCheckConfig, "allowedOrigins">): Response {
  const headers = new Headers(response.headers);
  headers.set("content-type", response.status === 204 ? headers.get("content-type") ?? "" : "application/json; charset=utf-8");
  if (response.status === 204) headers.delete("content-type");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("vary", "origin");
  const origin = request.headers.get("origin");
  if (origin && config.allowedOrigins.includes(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-methods", "POST, OPTIONS");
    headers.set("access-control-allow-headers", "content-type");
    headers.set("access-control-max-age", "600");
  }
  return new Response(response.body, { status: response.status, headers });
}

function json(body: SeoCheckResponse, status = httpStatusFor(body.code)): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function readJsonLimited(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new Error("body too large");
  }
  if (!request.body) throw new Error("missing body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("body too large");
    }
    chunks.push(value);
  }
  const text = new TextDecoder().decode(concat(chunks));
  if (!text.trim()) throw new Error("empty body");
  return JSON.parse(text) as unknown;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const size = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export function productionDeps(): SeoCheckDeps {
  return {
    config: configFromEnv(),
    resolver: getNodeResolver(),
    connector: getNodeConnector(),
  };
}
