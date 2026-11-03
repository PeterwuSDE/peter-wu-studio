import type { SeoLocale } from "./contract.ts";

/**
 * Link the homepage-check result (issue #4) to this follow-up form.
 * The page reads `scan` and `locale` in the browser. The server reloads the
 * snapshot from the scan directory and does not trust any other query facts.
 */
export function seoInquiryHref(scanReference: string, locale: SeoLocale = "en"): string {
  const params = new URLSearchParams({ scan: scanReference });
  if (locale === "zh") params.set("locale", "zh");
  return `/seo?${params.toString()}#inquiry`;
}
