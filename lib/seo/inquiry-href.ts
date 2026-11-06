import type { SeoCheckLocale } from "../../shared/seo-check/contract.ts";

/** Deep link used when a full page load should reopen the inquiry entry. */
export function seoInquiryHref(scanId: string, locale: SeoCheckLocale = "en"): string {
  const params = new URLSearchParams({ scan: scanId });
  if (locale === "zh") params.set("locale", "zh");
  return `/seo?${params.toString()}#seo-inquiry`;
}
