import {
  type SeoCheckCode,
  type SeoCheckCoverage,
  type SeoCheckLocale,
  type SeoCheckResponse,
  type SeoCheckStatus,
  type SeoFinding,
  type SeoRuleResult,
} from "../../shared/seo-check/contract";

const STATUSES = new Set<SeoCheckStatus>([
  "completed",
  "partial",
  "access_restricted",
  "unavailable",
  "invalid_target",
  "too_large",
  "unsupported_content",
  "rate_limited",
  "invalid_request",
]);

const CODES = new Set<SeoCheckCode>([
  "ok",
  "no_priority_findings",
  "partial",
  "javascript_not_executed",
  "invalid_request",
  "invalid_target",
  "blocked_target",
  "timeout",
  "network_error",
  "tls_error",
  "dns_error",
  "too_many_redirects",
  "access_restricted",
  "http_error",
  "too_large",
  "unsupported_content",
  "ip_rate_limit",
  "daily_cap",
  "request_id_conflict",
  "method_not_allowed",
  "internal_error",
]);

/** Statuses that include a checklist. Other statuses are not SEO conclusions. */
const REPORT_STATUSES = new Set<SeoCheckStatus>(["completed", "partial", "too_large", "unsupported_content"]);

export type SeoCheckTransport = {
  httpStatus: number | null;
  body: unknown;
};

export type SeoCheckBlock = {
  message: string;
  showRetry: boolean;
  showContact: boolean;
};

export type SeoCheckOutcome =
  | { kind: "report"; report: SeoCheckResponse }
  | { kind: "blocked"; block: SeoCheckBlock };

export function interpretSeoCheck(transport: SeoCheckTransport, locale: SeoCheckLocale): SeoCheckOutcome {
  const parsed = readResponse(transport.body);
  if (!parsed) return { kind: "blocked", block: transportBlock(transport.httpStatus, locale) };
  if (transport.httpStatus != null && transport.httpStatus !== 200) return { kind: "blocked", block: blockFrom(parsed) };
  if (!REPORT_STATUSES.has(parsed.status)) return { kind: "blocked", block: blockFrom(parsed) };
  return { kind: "report", report: parsed };
}

export function emptyAddressBlock(locale: SeoCheckLocale): SeoCheckBlock {
  return {
    message: locale === "zh"
      ? "请填写可公开访问的 http 或 https 网页地址。本次没有生成 SEO 结论。"
      : "Use a public http or https page address. No SEO result was created.",
    showRetry: false,
    showContact: false,
  };
}

function blockFrom(response: SeoCheckResponse): SeoCheckBlock {
  const wait = response.retryAfterSeconds != null && response.retryAfterSeconds > 0
    ? response.locale === "zh"
      ? ` 请在 ${response.retryAfterSeconds} 秒后再试。`
      : ` Try again in ${response.retryAfterSeconds} seconds.`
    : "";
  const contact = response.status === "rate_limited" || response.status === "unavailable" || response.status === "access_restricted" || response.code === "internal_error";
  const retry = response.status !== "invalid_target" && response.code !== "invalid_request";
  return { message: `${response.message}${wait}`, showRetry: retry, showContact: contact };
}

function transportBlock(status: number | null, locale: SeoCheckLocale): SeoCheckBlock {
  const zh = locale === "zh";
  if (status === 400) {
    return {
      message: zh ? "请填写可公开访问的 http 或 https 网页地址。本次没有生成 SEO 结论。" : "Use a public http or https page address. No SEO result was created.",
      showRetry: false,
      showContact: false,
    };
  }
  if (status === 405) {
    return { message: zh ? "请使用 POST。" : "Use POST.", showRetry: false, showContact: false };
  }
  if (status === 409) {
    return {
      message: zh ? "这个请求标识已经用于另一个网址。请换一个请求标识后再试。" : "This request id was already used for a different URL. Start a new request id and try again.",
      showRetry: true,
      showContact: false,
    };
  }
  if (status === 429) {
    return {
      message: zh ? "当前暂时无法检查，请稍后再试。" : "The free check is temporarily unavailable. Try again later.",
      showRetry: true,
      showContact: true,
    };
  }
  return {
    message: zh ? "检查未能完成。没有把本次记为成功结果。" : "The check could not be completed. Nothing was saved as a successful result.",
    showRetry: true,
    showContact: true,
  };
}

function readResponse(body: unknown): SeoCheckResponse | null {
  const record = asRecord(body);
  if (!record) return null;
  if (typeof record.status !== "string" || !STATUSES.has(record.status as SeoCheckStatus)) return null;
  if (typeof record.code !== "string" || !CODES.has(record.code as SeoCheckCode)) return null;
  const message = cleanText(record.message, 2000);
  if (!message) return null;
  const requestId = typeof record.requestId === "string" ? record.requestId : "";
  if (typeof record.cached !== "boolean") return null;
  if (typeof record.locale !== "string" || (record.locale !== "en" && record.locale !== "zh")) return null;
  const rules = readRules(record.rules);
  if (!rules) return null;
  const findings = readFindings(record.findings);
  if (!findings) return null;
  return {
    scanId: readScanId(record.scanId),
    requestId,
    normalizedUrl: typeof record.normalizedUrl === "string" ? record.normalizedUrl : "",
    finalUrl: typeof record.finalUrl === "string" && record.finalUrl ? record.finalUrl : null,
    locale: record.locale,
    checkedAt: typeof record.checkedAt === "string" && record.checkedAt ? record.checkedAt : null,
    ruleVersion: typeof record.ruleVersion === "string" ? record.ruleVersion : "",
    cached: record.cached,
    cacheExpiresAt: typeof record.cacheExpiresAt === "string" && record.cacheExpiresAt ? record.cacheExpiresAt : null,
    status: record.status as SeoCheckStatus,
    code: record.code as SeoCheckCode,
    message,
    scope: cleanText(record.scope, 2000) ?? "",
    coverage: readCoverage(record.coverage, rules),
    findings,
    rules,
    siteName: cleanText(record.siteName, 120),
    javascriptNotExecuted: record.javascriptNotExecuted === true,
    redirectCount: readCount(record.redirectCount) ?? 0,
    httpStatus: typeof record.httpStatus === "number" && Number.isInteger(record.httpStatus) ? record.httpStatus : null,
    retryAfterSeconds: readCount(record.retryAfterSeconds),
  };
}

function readFindings(value: unknown): SeoFinding[] | null {
  if (!Array.isArray(value)) return null;
  const findings: SeoFinding[] = [];
  for (const item of value) {
    const record = asRecord(item);
    if (!record) continue;
    const ruleId = record.ruleId;
    const evidence = cleanText(record.evidence, 500);
    const checkedAt = typeof record.checkedAt === "string" ? record.checkedAt : "";
    const reason = cleanText(record.reason, 600) ?? "";
    const condition = cleanText(record.condition, 400) ?? "";
    const url = typeof record.url === "string" ? record.url : "";
    if (typeof ruleId !== "string" || !evidence || !checkedAt || !url) continue;
    const suggestions = Array.isArray(record.suggestions)
      ? record.suggestions.map((suggestion) => cleanText(suggestion, 400)).filter((suggestion): suggestion is string => suggestion !== null).slice(0, 2)
      : [];
    if (suggestions.length === 0) continue;
    findings.push({
      ruleId: ruleId as SeoFinding["ruleId"],
      ruleVersion: typeof record.ruleVersion === "string" ? record.ruleVersion : "",
      url,
      evidence,
      checkedAt,
      reason,
      condition,
      suggestions,
      signal: typeof record.signal === "string" ? record.signal : "",
    });
    if (findings.length === 2) break;
  }
  return findings;
}

function readRules(value: unknown): SeoRuleResult[] | null {
  if (!Array.isArray(value)) return null;
  const rules: SeoRuleResult[] = [];
  for (const item of value) {
    const record = asRecord(item);
    if (!record || typeof record.ruleId !== "string") continue;
    if (record.status !== "pass" && record.status !== "review" && record.status !== "unknown" && record.status !== "not_applicable") continue;
    rules.push({
      ruleId: record.ruleId as SeoRuleResult["ruleId"],
      ruleVersion: typeof record.ruleVersion === "string" ? record.ruleVersion : "",
      status: record.status,
      signal: typeof record.signal === "string" ? record.signal : "",
      evidence: cleanText(record.evidence, 500) ?? "",
      summary: cleanText(record.summary, 400) ?? record.ruleId,
    });
  }
  return rules;
}

function readCoverage(value: unknown, rules: SeoRuleResult[]): SeoCheckCoverage {
  const record = asRecord(value);
  const completed = record ? readCount(record.completed) : null;
  const unknown = record ? readCount(record.unknown) : null;
  const notApplicable = record ? readCount(record.notApplicable) : null;
  const total = record ? readCount(record.total) : null;
  if (completed != null && unknown != null && notApplicable != null && total != null) {
    return { completed, unknown, notApplicable, total };
  }
  let passed = 0;
  let judgedUnknown = 0;
  let skipped = 0;
  for (const rule of rules) {
    if (rule.status === "pass" || rule.status === "review") passed += 1;
    else if (rule.status === "unknown") judgedUnknown += 1;
    else skipped += 1;
  }
  return { completed: passed, unknown: judgedUnknown, notApplicable: skipped, total: rules.length };
}

function readScanId(value: unknown): string | null {
  if (typeof value !== "string" || !/^scan_[A-Za-z0-9_-]{8,200}$/.test(value)) return null;
  return value;
}

function readCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 10_000) return null;
  return value;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, max);
}
