/**
 * Vercel Node function for POST /api/seo-check.
 *
 * The site stays a static export. This file is the lightweight Node entry
 * beside that export: no browser, model, paid SEO API, or queue.
 * Vercel requires shared Redis REST storage for scan snapshots and atomic
 * limits. Missing or unavailable storage fails closed; memory/file are local only.
 */
import { handleSeoCheckRequest, productionDeps } from "../shared/seo-check/http.ts";

export function POST(request: Request): Promise<Response> {
  return handleSeoCheckRequest(request, productionDeps());
}

export function OPTIONS(request: Request): Promise<Response> {
  return handleSeoCheckRequest(request, productionDeps());
}
