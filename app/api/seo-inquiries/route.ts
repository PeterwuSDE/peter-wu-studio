import { createProductionDeps } from "../../../lib/seo/production.ts";
import { handleInquiryHttp } from "../../../lib/seo/http.ts";

async function handle(request: Request) {
  return handleInquiryHttp(request, await createProductionDeps());
}

export function GET(request: Request) {
  return handle(request);
}

export function POST(request: Request) {
  return handle(request);
}

export function OPTIONS(request: Request) {
  return handle(request);
}
