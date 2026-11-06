import { RULE_STATUS_LABELS, type SeoCheckLocale, type SeoCheckResponse, type SeoRuleResult } from "../../shared/seo-check/contract";
import { copyFor } from "./copy";

export type PresentedRule = {
  key: string;
  ruleId: string;
  status: SeoRuleResult["status"];
  statusLabel: string;
  summary: string;
};

export type PresentedFinding = {
  key: string;
  ruleId: string;
  ruleVersion: string;
  url: string;
  evidence: string;
  checkedAt: string;
  condition: string;
  reason: string;
  suggestions: string[];
};

export type PresentedReport = {
  displayName: string;
  message: string;
  scope: string;
  normalizedUrl: string;
  finalUrl: string | null;
  timeLine: string;
  cacheUntil: string | null;
  ruleVersion: string;
  coverageLine: string;
  scriptNote: string | null;
  pageHttp: string | null;
  redirects: string | null;
  findings: PresentedFinding[];
  passed: PresentedRule[];
  review: PresentedRule[];
  unknown: PresentedRule[];
  notApplicable: PresentedRule[];
};

export function presentReport(report: SeoCheckResponse, locale: SeoCheckLocale): PresentedReport {
  const copy = copyFor(locale);
  const labels = RULE_STATUS_LABELS[locale];
  const time = report.checkedAt ? formatCheckedAt(report.checkedAt, locale) : null;
  const finalDiffers = Boolean(report.finalUrl && report.finalUrl !== report.normalizedUrl);
  return {
    displayName: report.siteName || hostname(report.finalUrl || report.normalizedUrl),
    message: report.message,
    scope: report.scope,
    normalizedUrl: report.normalizedUrl,
    finalUrl: finalDiffers ? report.finalUrl : null,
    timeLine: time ? (report.cached ? copy.cached(time) : copy.fresh(time)) : copy.missingTime,
    cacheUntil: report.cacheExpiresAt ? copy.cacheUntil(formatCheckedAt(report.cacheExpiresAt, locale)) : null,
    ruleVersion: report.ruleVersion,
    coverageLine: copy.coverage(report.coverage.completed, report.coverage.unknown, report.coverage.notApplicable),
    scriptNote: report.javascriptNotExecuted && !/javascript/i.test(report.message) ? copy.javascript : null,
    pageHttp: report.httpStatus != null ? String(report.httpStatus) : null,
    redirects: report.redirectCount > 0 ? String(report.redirectCount) : null,
    findings: report.findings.slice(0, 2).map((finding, index) => ({
      key: `${finding.ruleId}-${index}`,
      ruleId: finding.ruleId,
      ruleVersion: finding.ruleVersion,
      url: finding.url,
      evidence: finding.evidence,
      checkedAt: formatCheckedAt(finding.checkedAt, locale),
      condition: finding.condition,
      reason: finding.reason,
      suggestions: finding.suggestions.slice(0, 2),
    })),
    passed: presentRules(report.rules, "pass", labels.pass),
    review: presentRules(report.rules, "review", labels.review),
    unknown: presentRules(report.rules, "unknown", labels.unknown),
    notApplicable: presentRules(report.rules, "not_applicable", labels.not_applicable),
  };
}

export function formatCheckedAt(iso: string, locale: SeoCheckLocale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const formatted = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
  return `${formatted} UTC`;
}

function presentRules(rules: SeoRuleResult[], status: SeoRuleResult["status"], statusLabel: string): PresentedRule[] {
  return rules
    .filter((rule) => rule.status === status)
    .map((rule, index) => ({
      key: `${rule.ruleId}-${index}`,
      ruleId: rule.ruleId,
      status,
      statusLabel,
      summary: rule.summary,
    }));
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url || "";
  }
}
