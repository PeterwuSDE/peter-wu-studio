import { handleInquiryHttp, type HttpDeps } from "./http.ts";
import { createProductionDeps } from "./production.ts";

export interface NodeIncomingMessage {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface NodeServerResponse {
  statusCode: number;
  setHeader(name: string, value: string | number | readonly string[]): void;
  end(chunk?: string | Buffer): void;
}

function headerValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
}

function bodyText(req: NodeIncomingMessage): string | undefined {
  if (req.body == null || req.body === "") return undefined;
  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  const type = headerValue(req.headers["content-type"]);
  if (type.includes("application/x-www-form-urlencoded") && typeof req.body === "object") {
    return new URLSearchParams(req.body as Record<string, string>).toString();
  }
  return JSON.stringify(req.body);
}

export function nodeToWebRequest(req: NodeIncomingMessage): Request {
  const host = headerValue(req.headers.host) || "localhost";
  const proto = (headerValue(req.headers["x-forwarded-proto"]) || "https").split(",")[0].trim();
  const url = `${proto}://${host}${req.url || "/"}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    const rendered = headerValue(value);
    if (rendered) headers.set(key, rendered);
  }
  const method = req.method || "GET";
  const body = method === "GET" || method === "HEAD" ? undefined : bodyText(req);
  return new Request(url, { method, headers, body });
}

export async function vercelSeoHandler(
  req: NodeIncomingMessage,
  res: NodeServerResponse,
  deps?: HttpDeps,
): Promise<void> {
  const request = nodeToWebRequest(req);
  const response = await handleInquiryHttp(request, deps ?? await createProductionDeps());
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
}
