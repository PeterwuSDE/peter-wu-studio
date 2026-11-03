/**
 * Vercel Node function for POST /api/seo-check.
 *
 * The site stays a static export. This file is the lightweight Node entry
 * beside that export: no browser, model, paid SEO API, database, or queue.
 * Cache and rate limits default to process memory (no extra service). Set
 * SEO_CHECK_STORE_PATH only for one long-running Node process.
 */
import { handleSeoCheckRequest, productionDeps } from "../shared/seo-check/http.ts";

export function POST(request: Request): Promise<Response> {
  return handleSeoCheckRequest(request, productionDeps());
}

export function OPTIONS(request: Request): Promise<Response> {
  return handleSeoCheckRequest(request, productionDeps());
}
