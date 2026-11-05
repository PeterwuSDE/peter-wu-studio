/**
 * Frozen contract for the homepage SEO check.
 *
 * Client code, including the /seo page, should import this module only.
 * `shared/seo-check/index.ts` pulls in the Node fetcher and is server-only.
 *
 * `POST /api/seo-check` body: `{ url, requestId, locale? }`.
 * `locale` defaults to `en`. `en-*` and `zh-*` are accepted. `requestId` matches
 * `SEO_CHECK_REQUEST_ID_PATTERN`.
 *
 * Strings are untrusted plain text. Render them as text. Do not assign them to
 * innerHTML. `evidence` is length-limited text taken from the page, with
 * control characters removed, not HTML. `escapeHtml` is available for callers
 * that build markup themselves.
 *
 * `findings` is the priority list and contains at most two items.
 * `rules` is the full checklist. A `review` rule is "needs confirmation", not a
 * failure. Missing and cross-domain canonicals stay on the checklist and are
 * not promoted into `findings`.
 *
 * `checkedAt` is when the page was read. Cache hits keep that timestamp and set
 * `cached` to true. There is no sitewide score field.
 *
 * `POST /api/seo-inquiries` is specified here for the contact flow and is not
 * implemented by the scan service. Inquiry handlers must rebuild the snapshot
 * with `readStoredScan` rather than trusting finding text from the browser.
 */

export const SEO_CHECK_PATH = "/api/seo-check";
export const SEO_INQUIRY_PATH = "/api/seo-inquiries";
export const SEO_CHECK_RULE_VERSION = "homepage-2026-10-29.1";
export const SEO_CHECK_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;
export const SEO_CHECK_MAX_URL_LENGTH = 2048;

export type SeoCheckLocale = "en" | "zh";

export type SeoCheckStatus =
  | "completed"
  | "partial"
  | "access_restricted"
  | "unavailable"
  | "invalid_target"
  | "too_large"
  | "unsupported_content"
  | "rate_limited"
  | "invalid_request";

export type SeoCheckCode =
  | "ok"
  | "no_priority_findings"
  | "partial"
  | "javascript_not_executed"
  | "invalid_request"
  | "invalid_target"
  | "blocked_target"
  | "timeout"
  | "network_error"
  | "tls_error"
  | "dns_error"
  | "too_many_redirects"
  | "access_restricted"
  | "http_error"
  | "too_large"
  | "unsupported_content"
  | "ip_rate_limit"
  | "daily_cap"
  | "request_id_conflict"
  | "method_not_allowed"
  | "internal_error";

export type RuleStatus = "pass" | "review" | "unknown" | "not_applicable";

export type RuleId =
  | "https"
  | "title"
  | "description"
  | "h1"
  | "indexability"
  | "canonical"
  | "viewport"
  | "image_alt";

export const CHECKLIST_ORDER: readonly RuleId[] = [
  "https",
  "title",
  "description",
  "h1",
  "indexability",
  "canonical",
  "viewport",
  "image_alt",
];

/** Highest priority first. At most two eligible rules become findings. */
export const FINDING_PRIORITY: readonly RuleId[] = [
  "indexability",
  "https",
  "title",
  "description",
  "h1",
  "viewport",
  "image_alt",
  "canonical",
];

/**
 * Signals that may become priority findings.
 * `canonical` / `missing` and `canonical` / `cross_domain` are checklist
 * signals only, so a missing canonical is not treated as an error.
 */
export const PRIORITY_FINDING_SIGNALS: Record<RuleId, readonly string[]> = {
  https: ["http"],
  title: ["missing", "placeholder"],
  description: ["missing"],
  h1: ["missing", "multiple"],
  indexability: ["noindex"],
  canonical: ["invalid"],
  viewport: ["missing"],
  image_alt: ["missing_alt"],
};

export const RULE_SIGNALS: Record<RuleId, readonly string[]> = {
  https: ["https", "http"],
  title: ["present", "missing", "placeholder", "unknown"],
  description: ["present", "missing", "unknown"],
  h1: ["single", "missing", "multiple", "unknown"],
  indexability: ["noindex", "no_noindex", "unknown"],
  canonical: ["same_site", "missing", "cross_domain", "invalid", "unknown"],
  viewport: ["present", "missing", "unknown"],
  image_alt: ["ok", "missing_alt", "no_images", "unknown"],
};

export const NO_PRIORITY_FINDINGS_MESSAGE: Record<SeoCheckLocale, string> = {
  en: "No priority issues were found in the basic checks completed this time. Other pages, search performance, and items not checked still need a separate review.",
  zh: "本次已完成的基础检查中，未发现需要优先提示的问题。其他页面、搜索表现和未检测项目仍需另行分析。",
};

export const JAVASCRIPT_NOT_EXECUTED_MESSAGE: Record<SeoCheckLocale, string> = {
  en: "This check did not run JavaScript. Content that appears only after scripts run was not treated as missing.",
  zh: "本次未执行 JavaScript。仅在脚本运行后出现的内容不会被当成缺失。",
};

export const SEO_CHECK_SCOPE: Record<SeoCheckLocale, string> = {
  en: "This check reads one public homepage: its HTML and response headers. It does not follow links, download images or scripts, run JavaScript, or produce a sitewide SEO score.",
  zh: "本次只读取一个公开首页的 HTML 和响应头，不跟随站内链接，不下载图片或脚本，不执行 JavaScript，也不给出全站 SEO 分数。",
};

export const RULE_STATUS_LABELS: Record<SeoCheckLocale, Record<RuleStatus, string>> = {
  en: {
    pass: "Passed",
    review: "Needs confirmation",
    unknown: "Could not judge",
    not_applicable: "Not applicable",
  },
  zh: {
    pass: "已通过",
    review: "需确认",
    unknown: "无法判断",
    not_applicable: "不适用",
  },
};

export const CHECK_STATUS_LABELS: Record<SeoCheckLocale, Record<SeoCheckStatus, string>> = {
  en: {
    completed: "Completed",
    partial: "Partly completed",
    access_restricted: "Access restricted",
    unavailable: "Unavailable",
    invalid_target: "Address not allowed",
    too_large: "Response too large",
    unsupported_content: "Not HTML",
    rate_limited: "Limit reached",
    invalid_request: "Invalid request",
  },
  zh: {
    completed: "已完成",
    partial: "部分完成",
    access_restricted: "访问受限",
    unavailable: "暂时无法读取",
    invalid_target: "地址不可用",
    too_large: "响应过大",
    unsupported_content: "不是 HTML",
    rate_limited: "已达上限",
    invalid_request: "请求无效",
  },
};

export interface SeoCheckCoverage {
  /** Rules that finished as pass or review. */
  completed: number;
  unknown: number;
  notApplicable: number;
  total: number;
}

export interface SeoFinding {
  ruleId: RuleId;
  ruleVersion: string;
  /** Final URL when there was a response, otherwise the normalized request URL. */
  url: string;
  evidence: string;
  /** Original check time. Unchanged when `cached` is true. */
  checkedAt: string;
  reason: string;
  /** Applicability condition. For noindex this is the "if you want it indexed" clause. */
  condition: string;
  /** One or two fixed template steps. */
  suggestions: string[];
  signal: string;
}

export interface SeoRuleResult {
  ruleId: RuleId;
  ruleVersion: string;
  status: RuleStatus;
  signal: string;
  evidence: string;
  summary: string;
}

export interface SeoCheckResponse {
  scanId: string | null;
  requestId: string;
  /** Address after scheme, host, and fragment normalization, before redirects. */
  normalizedUrl: string;
  /** Address of the response that was read. Null when nothing was fetched. */
  finalUrl: string | null;
  locale: SeoCheckLocale;
  checkedAt: string | null;
  ruleVersion: string;
  cached: boolean;
  cacheExpiresAt: string | null;
  status: SeoCheckStatus;
  code: SeoCheckCode;
  message: string;
  scope: string;
  coverage: SeoCheckCoverage;
  findings: SeoFinding[];
  rules: SeoRuleResult[];
  siteName: string | null;
  javascriptNotExecuted: boolean;
  redirectCount: number;
  /** HTTP status from the fetched page, not from this API. */
  httpStatus: number | null;
  retryAfterSeconds: number | null;
}

export interface RuleFact {
  ruleId: RuleId;
  status: RuleStatus;
  signal: string;
  observation: string;
  count: number | null;
}

export interface Evaluation {
  finalUrl: string | null;
  redirectCount: number;
  status: SeoCheckStatus;
  code: SeoCheckCode;
  httpStatus: number | null;
  siteName: string | null;
  javascriptNotExecuted: boolean;
  rules: RuleFact[];
  findingRuleIds: RuleId[];
}

/** What the customer saw, rebuilt on the server from the stored check. */
export interface SeoScanSnapshot {
  scanId: string;
  requestId: string;
  normalizedUrl: string;
  finalUrl: string | null;
  locale: SeoCheckLocale;
  checkedAt: string;
  ruleVersion: string;
  /**
   * False. This is the stored check itself. A later live response sets
   * `SeoCheckResponse.cached` when it reuses this record.
   */
  cached: boolean;
  cacheExpiresAt: string;
  status: SeoCheckStatus;
  code: SeoCheckCode;
  message: string;
  scope: string;
  coverage: SeoCheckCoverage;
  findings: SeoFinding[];
  rules: SeoRuleResult[];
  siteName: string | null;
  javascriptNotExecuted: boolean;
  redirectCount: number;
  httpStatus: number | null;
}

export type SeoNotificationStatus = "pending" | "sent" | "failed" | "not_configured";

export interface SeoInquiryRequest {
  scanId: string;
  name: string;
  email: string;
  goal: string;
  phone?: string;
  requestId: string;
  locale?: string;
}

export interface SeoInquiryResponse {
  inquiryId: string;
  scanId: string;
  requestId: string;
  createdAt: string;
  notificationStatus: SeoNotificationStatus;
}

export interface SeoInquiryRecord {
  inquiryId: string;
  requestId: string;
  scanId: string;
  snapshot: SeoScanSnapshot;
  name: string;
  email: string;
  goal: string;
  phone: string | null;
  createdAt: string;
  deleteAt: string;
}

export interface SeoNotificationRecord {
  inquiryId: string;
  status: SeoNotificationStatus;
  attempts: number;
  nextAttemptAt: string | null;
}

export function normalizeLocale(input: unknown): SeoCheckLocale | null {
  if (input == null || input === "") return "en";
  if (typeof input !== "string") return null;
  const value = input.trim().toLowerCase();
  if (value === "en" || value.startsWith("en-")) return "en";
  if (value === "zh" || value.startsWith("zh-")) return "zh";
  return null;
}

export function sanitizePlainText(value: string, maxLength = 180): string {
  const cleaned = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function emptyCoverage(): SeoCheckCoverage {
  return { completed: 0, unknown: 0, notApplicable: 0, total: 0 };
}

export function coverageFrom(rules: readonly RuleFact[]): SeoCheckCoverage {
  let completed = 0;
  let unknown = 0;
  let notApplicable = 0;
  for (const rule of rules) {
    if (rule.status === "pass" || rule.status === "review") completed += 1;
    else if (rule.status === "unknown") unknown += 1;
    else notApplicable += 1;
  }
  return { completed, unknown, notApplicable, total: rules.length };
}

export function httpStatusFor(code: SeoCheckCode): number {
  switch (code) {
    case "invalid_request":
    case "invalid_target":
    case "blocked_target":
    case "method_not_allowed":
      return code === "method_not_allowed" ? 405 : 400;
    case "request_id_conflict":
      return 409;
    case "ip_rate_limit":
    case "daily_cap":
      return 429;
    case "internal_error":
      return 500;
    default:
      return 200;
  }
}
