/**
 * Controlled stand-in for POST /api/seo-check.
 * Import this from tests only. The live page must not import it.
 */
import type { SeoCheckClient } from "./check-client";
import { NO_PRIORITY_FINDINGS_MESSAGE, SEO_CHECK_RULE_VERSION, SEO_CHECK_SCOPE, type SeoCheckResponse, type SeoFinding, type SeoRuleResult } from "../../shared/seo-check/contract";

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

export function createSeoCheckDouble(
  select: (request: { url: string; locale: "en" | "zh"; requestId: string }) => SeoCheckDoubleCase = caseFromRequest,
): SeoCheckClient {
  return async (request) => {
    const selected = select(request);
    if (selected === "malformed") return { httpStatus: 200, body: { status: "completed" } };
    return { httpStatus: statusFor(selected), body: bodyFor(selected, request) };
  };
}

function caseFromRequest(request: { url: string }): SeoCheckDoubleCase {
  try {
    const name = new URL(request.url).pathname.replace(/^\//, "");
    if (isCase(name)) return name;
  } catch {
    // Non-URL input still returns a contract body.
  }
  return "complete";
}

function isCase(value: string): value is SeoCheckDoubleCase {
  return ["complete", "empty", "partial", "cached", "rejected", "network", "restricted", "oversized", "quota", "javascript", "malformed"].includes(value);
}

function statusFor(selected: SeoCheckDoubleCase): number {
  if (selected === "rejected") return 400;
  if (selected === "quota") return 429;
  return 200;
}

function bodyFor(selected: SeoCheckDoubleCase, request: { locale: "en" | "zh"; requestId: string }): SeoCheckResponse {
  const locale = request.locale;
  const shared = {
    requestId: request.requestId,
    locale,
    ruleVersion: SEO_CHECK_RULE_VERSION,
    normalizedUrl: "https://fixture.test/shop/",
    finalUrl: "https://fixture.test/shop/" as string | null,
    checkedAt: CHECKED_AT,
    cached: false,
    cacheExpiresAt: null,
    scope: SEO_CHECK_SCOPE[locale],
    siteName: "Fixture Shop" as string | null,
    javascriptNotExecuted: false,
    redirectCount: 0,
    httpStatus: 200 as number | null,
    retryAfterSeconds: null,
    findings: [] as SeoFinding[],
    rules: [] as SeoRuleResult[],
  };

  if (selected === "rejected") {
    return blank(locale, request.requestId, "invalid_target", "invalid_target", locale === "zh"
      ? "请填写可公开访问的 http 或 https 网页地址。本次没有生成 SEO 结论。"
      : "Use a public http or https page address. No SEO result was created.");
  }
  if (selected === "network") {
    return blank(locale, request.requestId, "unavailable", "network_error", locale === "zh"
      ? "暂时无法读取该页面。可以稍后重试。"
      : "The page could not be read just now. You can try again.");
  }
  if (selected === "restricted") {
    return blank(locale, request.requestId, "access_restricted", "access_restricted", locale === "zh"
      ? "该页面限制了本次访问。本次不评分，也不会绕过限制。"
      : "This page blocked the check. Nothing was scored, and the block was not bypassed.");
  }
  if (selected === "quota") {
    return {
      ...blank(locale, request.requestId, "rate_limited", "ip_rate_limit", locale === "zh"
        ? "当前暂时无法检查，请稍后再试。"
        : "The free check is temporarily unavailable. Try again later."),
      retryAfterSeconds: 30,
    };
  }
  if (selected === "empty") {
    return {
      ...shared,
      scanId: "scan_empty_fixture",
      status: "completed",
      code: "no_priority_findings",
      message: NO_PRIORITY_FINDINGS_MESSAGE[locale],
      coverage: { completed: 8, unknown: 0, notApplicable: 0, total: 8 },
      rules: [
        rule("https", "pass", "Final address uses HTTPS."),
        rule("title", "pass", "A title is present."),
      ],
    };
  }
  if (selected === "partial") {
    return {
      ...shared,
      scanId: "scan_partial_fixture",
      status: "partial",
      code: "partial",
      message: locale === "zh"
        ? "本次只完成了一部分检查。无法判断的项目已标出，没有被当成失败。"
        : "Only part of the check could be completed. Items that could not be judged are marked unknown and were not treated as failures.",
      coverage: { completed: 4, unknown: 3, notApplicable: 1, total: 8 },
      findings: [finding(locale, "description")],
      rules: [
        rule("https", "pass", "Final address uses HTTPS."),
        rule("h1", "unknown", "The main heading could not be judged from this response."),
        rule("image_alt", "not_applicable", "This response has no images."),
        rule("canonical", "review", "This review item stays on the checklist."),
      ],
    };
  }
  if (selected === "cached") {
    return {
      ...shared,
      scanId: "scan_cached_fixture",
      status: "completed",
      code: "ok",
      cached: true,
      cacheExpiresAt: "2026-10-30T15:04:00.000Z",
      message: locale === "zh" ? "首页检查已完成。下面只列出有证据的提示，没有全站分数。" : "The homepage check finished. Only evidence-backed notes are listed, and there is no sitewide score.",
      coverage: { completed: 8, unknown: 0, notApplicable: 0, total: 8 },
      findings: [finding(locale, "title")],
      rules: [rule("https", "pass", "Final address uses HTTPS.")],
    };
  }
  if (selected === "oversized") {
    return {
      ...shared,
      scanId: "scan_oversized_fixture",
      status: "too_large",
      code: "too_large",
      message: locale === "zh"
        ? "响应超过本次检查读取的大小，因此没有按完整页面评分。"
        : "The response is larger than this check reads, so it was not scored as a complete page.",
      coverage: { completed: 1, unknown: 7, notApplicable: 0, total: 8 },
      rules: [
        rule("https", "pass", "Final address uses HTTPS."),
        rule("title", "unknown", "The document was outside the HTML size limit."),
      ],
    };
  }
  if (selected === "javascript") {
    return {
      ...shared,
      scanId: "scan_javascript_fixture",
      status: "partial",
      code: "javascript_not_executed",
      javascriptNotExecuted: true,
      message: locale === "zh"
        ? "本次未执行 JavaScript。仅在脚本运行后出现的内容不会被当成缺失。"
        : "This check did not run JavaScript. Content that appears only after scripts run was not treated as missing.",
      coverage: { completed: 3, unknown: 4, notApplicable: 1, total: 8 },
      rules: [
        rule("https", "pass", "Final address uses HTTPS."),
        rule("h1", "unknown", "A main heading was not in the initial HTML."),
        rule("image_alt", "not_applicable", "No images were in the initial HTML."),
      ],
    };
  }
  return {
    ...shared,
    scanId: "scan_complete_fixture",
    normalizedUrl: "https://fixture.test/shop",
    finalUrl: "https://fixture.test/shop/",
    redirectCount: 1,
    status: "completed",
    code: "ok",
    message: locale === "zh" ? "首页检查已完成。下面只列出有证据的提示，没有全站分数。" : "The homepage check finished. Only evidence-backed notes are listed, and there is no sitewide score.",
    coverage: { completed: 6, unknown: 1, notApplicable: 1, total: 8 },
    findings: [finding(locale, "indexability"), finding(locale, "description"), finding(locale, "title")],
    rules: [
      rule("https", "pass", "Final address uses HTTPS."),
      rule("viewport", "pass", "A viewport declaration is present."),
      rule("h1", "unknown", "More than one h1 was not treated as a failure."),
      rule("image_alt", "not_applicable", "Decorative images with empty alt were not counted as errors."),
      rule("canonical", "review", "A third review signal stays out of the priority notes."),
    ],
  };
}

function blank(
  locale: "en" | "zh",
  requestId: string,
  status: SeoCheckResponse["status"],
  code: SeoCheckResponse["code"],
  message: string,
): SeoCheckResponse {
  return {
    scanId: null,
    requestId,
    normalizedUrl: "",
    finalUrl: null,
    locale,
    checkedAt: null,
    ruleVersion: SEO_CHECK_RULE_VERSION,
    cached: false,
    cacheExpiresAt: null,
    status,
    code,
    message,
    scope: SEO_CHECK_SCOPE[locale],
    coverage: { completed: 0, unknown: 0, notApplicable: 0, total: 0 },
    findings: [],
    rules: [],
    siteName: null,
    javascriptNotExecuted: false,
    redirectCount: 0,
    httpStatus: null,
    retryAfterSeconds: null,
  };
}

function rule(ruleId: SeoRuleResult["ruleId"], status: SeoRuleResult["status"], summary: string): SeoRuleResult {
  return { ruleId, ruleVersion: SEO_CHECK_RULE_VERSION, status, signal: status, evidence: summary, summary };
}

function finding(locale: "en" | "zh", ruleId: SeoFinding["ruleId"]): SeoFinding {
  const zh = locale === "zh";
  return {
    ruleId,
    ruleVersion: SEO_CHECK_RULE_VERSION,
    url: "https://fixture.test/shop/",
    evidence: `${FIXTURE_MARKER} ${ruleId}`,
    checkedAt: CHECKED_AT,
    condition: zh ? "若希望这个首页被公开收录。" : "If you want this homepage to be publicly indexed.",
    reason: zh ? "响应里看到了需要确认的信号。" : "The response included a signal worth confirming.",
    suggestions: zh ? ["按页面上的证据核对这项设置。"] : ["Check this setting against the evidence from the response."],
    signal: "missing",
  };
}
