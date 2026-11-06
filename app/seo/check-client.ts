import { SEO_CHECK_PATH, SEO_CHECK_REQUEST_ID_PATTERN } from "../../shared/seo-check/contract";
import type { SeoCheckTransport } from "./read-response";

export type { SeoCheckTransport };
export type SeoCheckClient = (request: { url: string; locale: "en" | "zh"; requestId: string }, signal?: AbortSignal) => Promise<SeoCheckTransport>;

export function createSeoCheckRequestId(): string {
  const id = `req_${crypto.randomUUID().replaceAll("-", "")}`;
  if (!SEO_CHECK_REQUEST_ID_PATTERN.test(id)) {
    return `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
  return id;
}

export async function postSeoCheck(request: { url: string; locale: "en" | "zh"; requestId: string }, signal?: AbortSignal): Promise<SeoCheckTransport> {
  try {
    const response = await fetch(SEO_CHECK_PATH, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        url: request.url,
        locale: request.locale,
        requestId: request.requestId,
      }),
      signal,
    });
    const text = await response.text();
    if (!text) return { httpStatus: response.status, body: null };
    try {
      return { httpStatus: response.status, body: JSON.parse(text) as unknown };
    } catch {
      return { httpStatus: response.status, body: null };
    }
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { httpStatus: null, body: null };
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
