/**
 * Controlled stand-in for POST /api/seo-check.
 * Import this from tests or a local dev harness only.
 * The live /seo page must not import it, and its marker string must not
 * appear in the production bundle.
 */
import type { SeoCheckClient } from "./check-client";
import type { SeoCheckRequest } from "./contract";

export const FIXTURE_MARKER = "FIXTURE_EVIDENCE_DO_NOT_SHIP";

export type SeoCheckDoubleCase =
  | "complete"
  | "empty"
  | "partial"
  | "cached"
  | "rejected"
  | "network"
  | "restricted"
  | "oversized"
  | "quota"
  | "javascript"
  | "malformed";

const CHECKED_AT = "2026-10-29T15:04:00.000Z";
const RULE_VERSION = "2026-10-29.1";

export function createSeoCheckDouble(
  select: (request: SeoCheckRequest) => SeoCheckDoubleCase = caseFromRequest,
): SeoCheckClient {
  return async (request) => {
    const selected = select(request);
    if (selected === "malformed") return { httpStatus: 200, body: { status: "complete" } };
    return { httpStatus: statusFor(selected), body: bodyFor(selected, request) };
  };
}

function caseFromRequest(request: SeoCheckRequest): SeoCheckDoubleCase {
  try {
    const name = new URL(request.url).pathname.replace(/^\//, "");
    if (isCase(name)) return name;
  } catch {
    // The caller passed a non-URL. The double still returns a contract body.
  }
  return "complete";
}

function isCase(value: string): value is SeoCheckDoubleCase {
  return ["complete", "empty", "partial", "cached", "rejected", "network", "restricted", "oversized", "quota", "javascript", "malformed"].includes(value);
}

function statusFor(selected: SeoCheckDoubleCase): number {
  if (selected === "rejected") return 400;
  if (selected === "quota") return 429;
  if (selected === "network") return 504;
  return 200;
}

function bodyFor(selected: SeoCheckDoubleCase, request: SeoCheckRequest): unknown {
  if (selected === "rejected") {
    return { status: "rejected", reason: "invalid_url", requestId: request.requestId };
  }
  if (selected === "network") {
    return { status: "unreadable", reason: "network", requestId: request.requestId };
  }
  if (selected === "restricted") {
    return { status: "unreadable", reason: "access_restricted", requestId: request.requestId };
  }
  if (selected === "quota") {
    return { status: "unavailable", reason: "quota", requestId: request.requestId };
  }

  const shared = {
    requestId: request.requestId,
    locale: request.locale,
    ruleVersion: RULE_VERSION,
    normalizedUrl: "https://fixture.test/shop/",
    finalUrl: "https://fixture.test/shop/",
    checkedAt: CHECKED_AT,
    cached: false,
  };

  if (selected === "empty") {
    return {
      ...shared,
      status: "complete",
      scanRef: "scan_empty_fixture",
      displayName: "Fixture Shop",
      coverage: { completed: 8, unknown: 0, notApplicable: 0 },
      findings: [],
      items: [
        { ruleId: "https", status: "pass", summary: "Final address uses HTTPS." },
        { ruleId: "title", status: "pass", summary: "A title is present." },
      ],
    };
  }

  if (selected === "partial") {
    return {
      ...shared,
      status: "partial",
      scanRef: "scan_partial_fixture",
      coverage: { completed: 4, unknown: 3, notApplicable: 1 },
      findings: [finding(request.locale, "description")],
      items: [
        { ruleId: "https", status: "pass", summary: "Final address uses HTTPS." },
        { ruleId: "h1", status: "unknown", summary: "The main heading could not be determined from this response." },
        { ruleId: "image_alt", status: "not_applicable", summary: "This response has no images." },
        { ruleId: "title", status: "review", summary: "This review item is not one of the two findings." },
      ],
    };
  }

  if (selected === "cached") {
    return {
      ...shared,
      status: "complete",
      scanRef: "scan_cached_fixture",
      cached: true,
      cacheExpiresAt: "2026-10-30T15:04:00.000Z",
      coverage: { completed: 8, unknown: 0, notApplicable: 0 },
      findings: [finding(request.locale, "title")],
      items: [{ ruleId: "https", status: "pass", summary: "Final address uses HTTPS." }],
    };
  }

  if (selected === "oversized") {
    return {
      ...shared,
      status: "partial",
      reason: "unsupported_document",
      scanRef: "scan_oversized_fixture",
      coverage: { completed: 1, unknown: 7, notApplicable: 0 },
      findings: [],
      items: [
        { ruleId: "https", status: "pass", summary: "Final address uses HTTPS." },
        { ruleId: "title", status: "unknown", summary: "The document was outside the HTML size limit." },
      ],
    };
  }

  if (selected === "javascript") {
    return {
      ...shared,
      status: "partial",
      scanRef: "scan_javascript_fixture",
      javascriptNotExecuted: true,
      coverage: { completed: 3, unknown: 4, notApplicable: 1 },
      findings: [],
      items: [
        { ruleId: "https", status: "pass", summary: "Final address uses HTTPS." },
        { ruleId: "h1", status: "unknown", summary: "A main heading was not in the initial HTML." },
        { ruleId: "image_alt", status: "not_applicable", summary: "No images were in the initial HTML." },
      ],
    };
  }

  return {
    ...shared,
    status: "complete",
    scanRef: "scan_complete_fixture",
    normalizedUrl: "https://fixture.test/shop",
    finalUrl: "https://fixture.test/shop/",
    displayName: "Fixture Shop",
    coverage: { completed: 6, unknown: 1, notApplicable: 1 },
    findings: [
      finding(request.locale, "indexing"),
      finding(request.locale, "description"),
      finding(request.locale, "title"),
    ],
    items: [
      { ruleId: "https", status: "pass", summary: "Final address uses HTTPS." },
      { ruleId: "viewport", status: "pass", summary: "A viewport declaration is present." },
      { ruleId: "h1", status: "unknown", summary: "More than one h1 was not treated as a failure." },
      { ruleId: "image_alt", status: "not_applicable", summary: "Decorative images with empty alt were not counted as errors." },
      { ruleId: "canonical", status: "review", summary: "A third review signal stays out of the priority notes." },
    ],
  };
}

function finding(locale: SeoCheckRequest["locale"], ruleId: string) {
  const zh = locale === "zh";
  return {
    ruleId,
    ruleVersion: RULE_VERSION,
    url: "https://fixture.test/shop/",
    evidence: `${FIXTURE_MARKER} ${ruleId}`,
    checkedAt: CHECKED_AT,
    condition: zh ? "若希望这个首页被公开收录。" : "If you want this homepage to be publicly indexed.",
    explanation: zh ? "响应里看到了需要确认的信号。" : "The response included a signal worth confirming.",
    suggestions: zh ? ["按页面上的证据核对这项设置。"] : ["Check this setting against the evidence from the response."],
  };
}
