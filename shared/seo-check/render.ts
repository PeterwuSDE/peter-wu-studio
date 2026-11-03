import {
  SEO_CHECK_RULE_VERSION,
  SEO_CHECK_SCOPE,
  coverageFrom,
  emptyCoverage,
  type SeoCheckCode,
  type SeoCheckLocale,
  type SeoCheckResponse,
  type SeoCheckStatus,
  type SeoFinding,
  type SeoRuleResult,
  type SeoScanSnapshot,
} from "./contract.ts";
import { describeRule, statusMessage } from "./messages.ts";
import type { StoredScan } from "./store.ts";

export function renderStoredScan(
  scan: StoredScan,
  input: { locale: SeoCheckLocale; requestId: string; cached: boolean; maxBytes: number },
): SeoCheckResponse {
  const described = new Map(scan.evaluation.rules.map((rule) => [rule.ruleId, describeRule(rule, input.locale)]));
  const rules: SeoRuleResult[] = scan.evaluation.rules.map((rule) => {
    const copy = described.get(rule.ruleId);
    if (!copy) throw new Error(`Missing copy for ${rule.ruleId}`);
    return {
      ruleId: rule.ruleId,
      ruleVersion: scan.ruleVersion,
      status: rule.status,
      signal: rule.signal,
      evidence: copy.evidence,
      summary: copy.summary,
    };
  });
  const findingUrl = scan.evaluation.finalUrl ?? scan.normalizedUrl;
  const findings: SeoFinding[] = [];
  for (const ruleId of scan.evaluation.findingRuleIds.slice(0, 2)) {
    const rule = scan.evaluation.rules.find((item) => item.ruleId === ruleId);
    const copy = described.get(ruleId);
    if (!rule || !copy || copy.suggestions.length === 0 || !copy.reason || !copy.condition) {
      throw new Error(`Missing finding copy for ${ruleId}:${rule?.signal ?? ""}`);
    }
    findings.push({
      ruleId,
      ruleVersion: scan.ruleVersion,
      url: findingUrl,
      evidence: copy.evidence,
      checkedAt: scan.checkedAt,
      reason: copy.reason,
      condition: copy.condition,
      suggestions: copy.suggestions.slice(0, 2),
      signal: rule.signal,
    });
  }
  return {
    scanId: scan.scanId,
    requestId: input.requestId,
    normalizedUrl: scan.normalizedUrl,
    finalUrl: scan.evaluation.finalUrl,
    locale: input.locale,
    checkedAt: scan.checkedAt,
    ruleVersion: scan.ruleVersion,
    cached: input.cached,
    cacheExpiresAt: new Date(scan.cacheExpiresAt).toISOString(),
    status: scan.evaluation.status,
    code: scan.evaluation.code,
    message: statusMessage(scan.evaluation, input.locale, input.maxBytes),
    scope: SEO_CHECK_SCOPE[input.locale],
    coverage: coverageFrom(scan.evaluation.rules),
    findings,
    rules,
    siteName: scan.evaluation.siteName,
    javascriptNotExecuted: scan.evaluation.javascriptNotExecuted,
    redirectCount: scan.evaluation.redirectCount,
    httpStatus: scan.evaluation.httpStatus,
    retryAfterSeconds: null,
  };
}

export function snapshotFrom(body: SeoCheckResponse): SeoScanSnapshot | null {
  if (!body.scanId || !body.checkedAt || !body.cacheExpiresAt) return null;
  return {
    scanId: body.scanId,
    requestId: body.requestId,
    normalizedUrl: body.normalizedUrl,
    finalUrl: body.finalUrl,
    locale: body.locale,
    checkedAt: body.checkedAt,
    ruleVersion: body.ruleVersion,
    cached: false,
    cacheExpiresAt: body.cacheExpiresAt,
    status: body.status,
    code: body.code,
    message: body.message,
    scope: body.scope,
    coverage: body.coverage,
    findings: body.findings,
    rules: body.rules,
    siteName: body.siteName,
    javascriptNotExecuted: body.javascriptNotExecuted,
    redirectCount: body.redirectCount,
    httpStatus: body.httpStatus,
  };
}

export function errorResponse(input: {
  locale: SeoCheckLocale;
  requestId: string;
  normalizedUrl?: string;
  finalUrl?: string | null;
  status: SeoCheckStatus;
  code: SeoCheckCode;
  message: string;
  retryAfterSeconds?: number | null;
  redirectCount?: number;
  httpStatus?: number | null;
}): SeoCheckResponse {
  return {
    scanId: null,
    requestId: input.requestId,
    normalizedUrl: input.normalizedUrl ?? "",
    finalUrl: input.finalUrl ?? null,
    locale: input.locale,
    checkedAt: null,
    ruleVersion: SEO_CHECK_RULE_VERSION,
    cached: false,
    cacheExpiresAt: null,
    status: input.status,
    code: input.code,
    message: input.message,
    scope: SEO_CHECK_SCOPE[input.locale],
    coverage: emptyCoverage(),
    findings: [],
    rules: [],
    siteName: null,
    javascriptNotExecuted: false,
    redirectCount: input.redirectCount ?? 0,
    httpStatus: input.httpStatus ?? null,
    retryAfterSeconds: input.retryAfterSeconds ?? null,
  };
}
