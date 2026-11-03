import { SEO_CHECK_PATH, type SeoCheckRequest, type SeoCheckTransport } from "./contract";

export type SeoCheckClient = (request: SeoCheckRequest, signal?: AbortSignal) => Promise<SeoCheckTransport>;

export async function postSeoCheck(request: SeoCheckRequest, signal?: AbortSignal): Promise<SeoCheckTransport> {
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
