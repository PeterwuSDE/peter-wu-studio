import type { SeoCheckLocale } from "./contract";
import { siteEmail } from "../site";

export const SEO_INQUIRY_ENTRY_ID = "seo-inquiry";
export const SEO_INQUIRY_EVENT = "northline:seo-inquiry";
export const SEO_INQUIRY_STORAGE_KEY = "northline:seo-inquiry";

/**
 * What the visitor saw when they asked Northline to go further.
 * Issue #5 should treat `scanRef` as a lookup key and re-validate the
 * scan on the server. The other fields are display context, not proof.
 */
export type SeoInquiryContext = {
  scanRef: string;
  requestId: string;
  normalizedUrl: string;
  finalUrl: string;
  locale: SeoCheckLocale;
  checkedAt: string;
  ruleVersion: string;
  cached: boolean;
  status: "complete" | "partial";
};

export type SeoInquiryHandler = (context: SeoInquiryContext) => void;

export type InquiryTarget = {
  remember(context: SeoInquiryContext): void;
  reveal(context: SeoInquiryContext): void;
  notify(context: SeoInquiryContext): boolean;
};

let handler: SeoInquiryHandler | null = null;

/**
 * Issue #5 registers the inquiry form here. Return the unsubscribe function.
 * Handling `northline:seo-inquiry` and calling preventDefault is equivalent:
 * the check UI then skips its fallback panel. Use one of the two.
 */
export function registerSeoInquiryHandler(next: SeoInquiryHandler): () => void {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
}

export function requestSeoInquiry(context: SeoInquiryContext): "handled" | "unhandled" {
  if (typeof window === "undefined") return "unhandled";
  return deliverSeoInquiry(context, createBrowserInquiryTarget());
}

export function deliverSeoInquiry(context: SeoInquiryContext, target: InquiryTarget): "handled" | "unhandled" {
  target.remember(context);
  target.reveal(context);
  return target.notify(context) ? "handled" : "unhandled";
}

export function inquiryMailto(context: SeoInquiryContext): string {
  const subject = `Homepage check ${context.scanRef}`;
  const body = [
    `Scan reference: ${context.scanRef}`,
    `Normalized URL: ${context.normalizedUrl}`,
    `Final URL: ${context.finalUrl}`,
    `Checked at: ${context.checkedAt}`,
    `Rule version: ${context.ruleVersion}`,
    "",
    "What I want to improve:",
    "",
  ].join("\n");
  return `mailto:${siteEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function readSeoInquiryContext(): SeoInquiryContext | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return parseStoredInquiry(sessionStorage.getItem(SEO_INQUIRY_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function parseStoredInquiry(value: string | null): SeoInquiryContext | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<SeoInquiryContext>;
    if (!parsed || typeof parsed !== "object") return null;
    if (!isToken(parsed.scanRef) || !isToken(parsed.requestId)) return null;
    if (!isHttpUrl(parsed.normalizedUrl) || !isHttpUrl(parsed.finalUrl)) return null;
    if (parsed.locale !== "en" && parsed.locale !== "zh") return null;
    if (parsed.status !== "complete" && parsed.status !== "partial") return null;
    if (typeof parsed.checkedAt !== "string" || typeof parsed.ruleVersion !== "string") return null;
    if (typeof parsed.cached !== "boolean") return null;
    return {
      scanRef: parsed.scanRef,
      requestId: parsed.requestId,
      normalizedUrl: parsed.normalizedUrl,
      finalUrl: parsed.finalUrl,
      locale: parsed.locale,
      checkedAt: parsed.checkedAt,
      ruleVersion: parsed.ruleVersion,
      cached: parsed.cached,
      status: parsed.status,
    };
  } catch {
    return null;
  }
}

export function createBrowserInquiryTarget(): InquiryTarget {
  return {
    remember(context) {
      try {
        sessionStorage.setItem(SEO_INQUIRY_STORAGE_KEY, JSON.stringify(context));
      } catch {
        // Storage can be unavailable. The on-page entry still shows the reference.
      }
    },
    reveal(context) {
      const url = new URL(window.location.href);
      url.searchParams.set("scan", context.scanRef);
      url.hash = SEO_INQUIRY_ENTRY_ID;
      window.history.replaceState({ seoInquiry: context.scanRef }, "", `${url.pathname}${url.search}${url.hash}`);
    },
    notify(context) {
      const event = new CustomEvent(SEO_INQUIRY_EVENT, { cancelable: true, detail: context });
      const eventHandled = !window.dispatchEvent(event);
      if (handler) {
        handler(context);
        return true;
      }
      return eventHandled;
    },
  };
}

function isToken(value: unknown): value is string {
  return typeof value === "string" && value.length >= 6 && value.length <= 200 && !/\s/.test(value);
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
