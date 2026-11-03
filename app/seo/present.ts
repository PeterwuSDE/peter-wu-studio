import type { SeoCheckBlock, SeoCheckItem, SeoCheckLocale, SeoCheckReport, SeoSignalStatus } from "./contract";
import { copyFor, type SeoCheckCopy } from "./copy";

export type PresentedItem = {
  key: string;
  ruleId: string;
  status: Exclude<SeoSignalStatus, "review">;
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
  explanation: string;
  suggestions: string[];
};

export type PresentedReport = {
  displayName: string;
  normalizedUrl: string;
  finalUrl: string | null;
  timeLine: string;
  cacheUntil: string | null;
  ruleVersion: string;
  coverageLine: string;
  partialNote: string | null;
  unsupportedNote: string | null;
  scriptNote: string | null;
  findings: PresentedFinding[];
  emptyFindings: string | null;
  nothingCompleted: string | null;
  passed: PresentedItem[];
  unknown: PresentedItem[];
  notApplicable: PresentedItem[];
};

export type PresentedBlock = {
  message: string;
  showRetry: boolean;
  showContact: boolean;
};

export function presentReport(report: SeoCheckReport, locale: SeoCheckLocale): PresentedReport {
  const copy = copyFor(locale);
  const time = formatCheckedAt(report.checkedAt, locale);
  const finalDiffers = report.finalUrl !== report.normalizedUrl;
  return {
    displayName: report.displayName || hostname(report.finalUrl),
    normalizedUrl: report.normalizedUrl,
    finalUrl: finalDiffers ? report.finalUrl : null,
    timeLine: report.cached ? copy.cached(time) : copy.fresh(time),
    cacheUntil: report.cacheExpiresAt ? copy.cacheUntil(formatCheckedAt(report.cacheExpiresAt, locale)) : null,
    ruleVersion: report.ruleVersion,
    coverageLine: copy.coverage(report.coverage.completed, report.coverage.unknown, report.coverage.notApplicable),
    partialNote: report.status === "partial" ? copy.partial : null,
    unsupportedNote: report.unsupportedDocument ? copy.unsupported : null,
    scriptNote: report.javascriptNotExecuted ? copy.javascript : null,
    findings: report.findings.slice(0, 2).map((finding, index) => ({
      key: `${finding.ruleId}-${index}`,
      ruleId: finding.ruleId,
      ruleVersion: finding.ruleVersion,
      url: finding.url,
      evidence: finding.evidence,
      checkedAt: formatCheckedAt(finding.checkedAt, locale),
      condition: finding.condition,
      explanation: finding.explanation,
      suggestions: finding.suggestions.slice(0, 2),
    })),
    emptyFindings: report.findings.length === 0 && report.coverage.completed > 0 ? copy.emptyFindings : null,
    nothingCompleted: report.findings.length === 0 && report.coverage.completed === 0 ? copy.nothingCompleted : null,
    passed: presentItems(report.items, "pass", copy, locale),
    unknown: presentItems(report.items, "unknown", copy, locale),
    notApplicable: presentItems(report.items, "not_applicable", copy, locale),
  };
}

export function presentBlock(block: SeoCheckBlock, locale: SeoCheckLocale): PresentedBlock {
  const copy = copyFor(locale);
  const message = {
    invalid_url: copy.invalidUrl,
    network: copy.network,
    access_restricted: copy.access,
    unsupported_document: copy.unsupported,
    quota: copy.quota,
    service: copy.service,
  }[block.reason];
  return {
    message,
    showRetry: block.reason !== "invalid_url",
    showContact: block.reason !== "invalid_url",
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

function presentItems(
  items: SeoCheckItem[],
  status: Exclude<SeoSignalStatus, "review">,
  copy: SeoCheckCopy,
  locale: SeoCheckLocale,
): PresentedItem[] {
  const statusLabel = status === "pass" ? copy.passedMark : status === "unknown" ? copy.unknown : copy.notApplicable;
  return items
    .filter((item) => item.status === status)
    .map((item, index) => ({
      key: `${item.ruleId}-${index}`,
      ruleId: item.ruleId,
      status,
      statusLabel,
      summary: item.summary ?? ruleLabel(item.ruleId, locale),
    }));
}

function ruleLabel(ruleId: string, locale: SeoCheckLocale): string {
  const rules: Record<string, string> = copyFor(locale).rules;
  return rules[ruleId] ?? ruleId;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
