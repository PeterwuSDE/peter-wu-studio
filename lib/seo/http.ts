import type { InquiryDeps } from "./inquiry-service.ts";
import { createInquiry, deleteInquiry, sweepDueNotifications } from "./inquiry-service.ts";
import { inquiryCopy, type InquiryErrorCode } from "./messages.ts";
import { siteEmail } from "../../app/site.ts";

export interface HttpDeps extends InquiryDeps {
  allowedOrigins: string[];
  retryTokens: string[];
}

const ERROR_STATUS: Record<InquiryErrorCode, number> = {
  validation: 400,
  origin_not_allowed: 403,
  unauthorized: 401,
  method_not_allowed: 405,
  scan_not_found: 422,
  scan_expired: 422,
  scan_invalid: 422,
  scan_unavailable: 503,
  conflict: 409,
  rate_limited: 429,
  persistence_unconfigured: 503,
  save_failed: 503,
  unsupported_media: 415,
  unavailable: 503,
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function originAllowed(request: Request, allowed: string[]): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return allowed.includes(origin);
}

function wantsJson(request: Request, kind: "json" | "form"): boolean {
  if (kind === "json") return true;
  return (request.headers.get("accept") ?? "").includes("application/json");
}

function localeOf(value: Record<string, unknown>): "en" | "zh" {
  return value.locale === "zh" ? "zh" : "en";
}

function field(value: Record<string, unknown>, key: string): string {
  const raw = value[key];
  return typeof raw === "string" ? raw : "";
}

async function readPayload(request: Request): Promise<
  | { kind: "json" | "form"; value: Record<string, unknown> }
  | { kind: "error"; error: "validation" | "unsupported_media" }
> {
  const type = request.headers.get("content-type") ?? "";
  const text = await request.text();
  if (text.length > 20_000) return { kind: "error", error: "validation" };
  if (type.includes("application/json")) {
    try {
      const value = JSON.parse(text) as unknown;
      if (!value || typeof value !== "object" || Array.isArray(value)) return { kind: "error", error: "validation" };
      return { kind: "json", value: value as Record<string, unknown> };
    } catch {
      return { kind: "error", error: "validation" };
    }
  }
  if (type.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(text);
    const value: Record<string, unknown> = {};
    for (const [key, item] of params) value[key] = item;
    return { kind: "form", value };
  }
  return { kind: "error", error: "unsupported_media" };
}

function json(body: unknown, status: number, request: Request, deps: HttpDeps): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  applyCors(headers, request, deps);
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

function html(body: string, status: number, request: Request, deps: HttpDeps): Response {
  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  applyCors(headers, request, deps);
  return new Response(body, { status, headers });
}

function applyCors(headers: Headers, request: Request, deps: HttpDeps) {
  const origin = request.headers.get("origin");
  if (origin && deps.allowedOrigins.includes(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
    headers.set("access-control-allow-methods", routeName(new URL(request.url).pathname) === "retry" ? "GET, POST, OPTIONS" : "POST, OPTIONS");
    headers.set("access-control-allow-headers", "Content-Type, Accept, Authorization");
  }
}

function tokenMatches(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length || left.length === 0) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

function retryAuthorized(request: Request, tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  if (!match) return false;
  return tokens.some((token) => tokenMatches(match[1], token));
}

function pageShell(title: string, main: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
</head>
<body>
<main>
${main}
<p><a href="mailto:${escapeHtml(siteEmail)}">${escapeHtml(siteEmail)}</a></p>
<p><a href="/seo#inquiry">Back to the form</a></p>
</main>
</body>
</html>`;
}

function failureHtml(value: Record<string, unknown>, error: InquiryErrorCode): string {
  const copy = inquiryCopy(localeOf(value));
  const message = copy.errors[error] ?? copy.errors.save_failed;
  return pageShell("Request not submitted", `
<h1>${escapeHtml(message)}</h1>
<form action="/api/seo-inquiries" method="post">
<input type="hidden" name="scanId" value="${escapeHtml(field(value, "scanId"))}">
<input type="hidden" name="requestId" value="${escapeHtml(field(value, "requestId"))}">
<input type="hidden" name="locale" value="${escapeHtml(localeOf(value))}">
<label>Name<input name="name" value="${escapeHtml(field(value, "name"))}" required></label>
<label>Email<input name="email" type="email" value="${escapeHtml(field(value, "email"))}" required></label>
<label>What do you want to improve?<textarea name="goal" required>${escapeHtml(field(value, "goal"))}</textarea></label>
<label>Phone (optional)<input name="phone" value="${escapeHtml(field(value, "phone"))}"></label>
<button type="submit">Send this request</button>
</form>`);
}

function successHtml(value: Record<string, unknown>, inquiryId: string, delivered: boolean): string {
  const copy = inquiryCopy(localeOf(value));
  const extra = delivered ? "" : `<p>${escapeHtml(copy.notSent)}</p>`;
  return pageShell("Request received", `
<h1>${escapeHtml(copy.received)} ${escapeHtml(inquiryId)}</h1>
${extra}`);
}

function routeName(pathname: string): "create" | "delete" | "retry" | "unknown" {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/api/seo-inquiries") return "create";
  if (path === "/api/seo-inquiry-deletions") return "delete";
  if (path === "/api/seo-inquiry-retries") return "retry";
  return "unknown";
}

export async function handleInquiryHttp(request: Request, deps: HttpDeps): Promise<Response> {
  const url = new URL(request.url);
  const route = routeName(url.pathname);
  if (request.method === "OPTIONS") {
    return json({ ok: true }, 204, request, deps);
  }
  const methodAllowed = request.method === "POST" || (route === "retry" && request.method === "GET");
  if (route === "unknown" || !methodAllowed) {
    return json({ received: false, error: "method_not_allowed" }, 405, request, deps);
  }
  if (!originAllowed(request, deps.allowedOrigins)) {
    return json({ received: false, error: "origin_not_allowed" }, 403, request, deps);
  }

  if (route === "retry") {
    if (!retryAuthorized(request, deps.retryTokens)) {
      return json({ received: false, error: "unauthorized" }, 401, request, deps);
    }
    if (!deps.store) {
      return json({ received: false, error: "persistence_unconfigured" }, 503, request, deps);
    }
    try {
      const summary = await sweepDueNotifications(deps, 10);
      return json({ ok: true, ...summary }, 200, request, deps);
    } catch (error) {
      deps.logger?.error({
        scope: "seo-inquiry",
        event: "retry_failed",
        errorName: error instanceof Error ? error.name : "Error",
      });
      return json({ received: false, error: "unavailable" }, 503, request, deps);
    }
  }

  const payload = await readPayload(request);
  const jsonResponse = payload.kind === "error" ? true : wantsJson(request, payload.kind);
  if (payload.kind === "error") {
    return respond(request, deps, jsonResponse, payload.error, {});
  }

  try {
    if (route === "delete") {
      const result = await deleteInquiry(payload.value, deps, clientKey(request));
      if (!result.ok) {
        const error = result.error === "not_found" ? "not_found" : result.error;
        return deletionResponse(request, deps, jsonResponse, error);
      }
      return json({ deleted: true }, 200, request, deps);
    }

    const result = await createInquiry(payload.value, deps, clientKey(request));
    if (!result.ok) {
      return respond(request, deps, jsonResponse, result.error, payload.value);
    }
    const body = {
      inquiryId: result.inquiryId,
      scanId: result.scanId,
      requestId: result.requestId,
      createdAt: result.createdAt,
      notificationStatus: result.notification.status,
      received: true as const,
    };
    if (!jsonResponse) {
      return html(successHtml(payload.value, result.inquiryId, result.notification.status === "sent"), result.created ? 201 : 200, request, deps);
    }
    return json(body, result.created ? 201 : 200, request, deps);
  } catch (error) {
    deps.logger?.error({
      scope: "seo-inquiry",
      event: "unhandled",
      errorName: error instanceof Error ? error.name : "Error",
    });
    return respond(request, deps, jsonResponse, "save_failed", payload.value);
  }
}

function deletionResponse(request: Request, deps: HttpDeps, asJson: boolean, error: string): Response {
  if (error === "not_found") {
    return json({ received: false, error: "not_found" }, 404, request, deps);
  }
  const code = (error in ERROR_STATUS ? error : "save_failed") as InquiryErrorCode;
  if (!asJson) return html(pageShell("Request not submitted", `<h1>${escapeHtml(inquiryCopy("en").errors[code] ?? inquiryCopy("en").errors.save_failed)}</h1>`), ERROR_STATUS[code], request, deps);
  return json({ received: false, error: code }, ERROR_STATUS[code], request, deps);
}

function respond(
  request: Request,
  deps: HttpDeps,
  asJson: boolean,
  error: InquiryErrorCode,
  value: Record<string, unknown>,
): Response {
  const status = ERROR_STATUS[error] ?? 500;
  if (!asJson && request.method === "POST") {
    return html(failureHtml(value, error), status, request, deps);
  }
  return json({ received: false, error }, status, request, deps);
}
