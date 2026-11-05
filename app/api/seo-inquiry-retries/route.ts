import { createProductionDeps } from "../../../lib/seo/production.ts";
import { handleInquiryHttp } from "../../../lib/seo/http.ts";

export async function POST(request: Request) {
  return handleInquiryHttp(request, await createProductionDeps());
}

export async function GET(request: Request) {
  return handleInquiryHttp(request, await createProductionDeps());
}
