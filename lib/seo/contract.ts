/**
 * Shared homepage-check contract for issues #3, #4, and #5.
 *
 * Issue #3 owns scanning. This module is the shape #5 will accept from a
 * ScanDirectory (see scan-directory.ts). Client requests may send only a scan
 * reference plus contact fields; displayed facts are copied from the directory.
 *
 * Design: docs/superpowers/specs/2026-10-29-northline-homepage-seo-check-design.md
 * sections 7, 8, and 11.
 */

export type SeoLocale = "en" | "zh";

export type SeoRunStatus = "completed" | "partial" | "unavailable";

export type SeoCheckState = "pass" | "confirm" | "unknown" | "not_applicable";

export interface SeoCoverage {
  completed: number;
  unknown: number;
  notApplicable: number;
}

export interface SeoCheckItem {
  ruleId: string;
  ruleVersion: string;
  state: SeoCheckState;
  url: string;
  observed: string;
}

/** A finding actually shown to the visitor. At most two. */
export interface SeoDisplayedFinding {
  ruleId: string;
  ruleVersion: string;
  url: string;
  observed: string;
  evidence: string;
  checkedAt: string;
  reason: string;
  suggestion: string;
}

/**
 * Server-verified summary of one homepage check.
 * Inquiry records copy this verbatim so the lead still explains itself after
 * the scan cache expires.
 */
export interface SeoScanSnapshot {
  reference: string;
  canonicalUrl: string;
  finalUrl: string;
  checkedAt: string;
  ruleVersion: string;
  locale: SeoLocale;
  status: SeoRunStatus;
  cacheHit: boolean;
  cacheExpiresAt: string;
  coverage: SeoCoverage;
  checks: SeoCheckItem[];
  findings: SeoDisplayedFinding[];
}

export type ScanLookupResult =
  | { status: "verified"; snapshot: SeoScanSnapshot }
  | { status: "not_found" }
  | { status: "expired" }
  | { status: "invalid" };

export interface ScanDirectory {
  /**
   * Verify `reference` against the scan store. Return the snapshot #3 recorded.
   * Do not accept URLs, findings, or timestamps supplied by the browser.
   */
  lookup(reference: string, now: Date): Promise<ScanLookupResult>;
}

export interface InquiryInput {
  scanReference: string;
  submissionId: string;
  name: string;
  email: string;
  goal: string;
  phone: string | null;
}

export interface InquiryRecord {
  inquiryId: string;
  submissionId: string;
  fingerprint: string;
  scanReference: string;
  snapshot: SeoScanSnapshot;
  name: string;
  email: string;
  goal: string;
  phone: string | null;
  createdAt: string;
  deleteAt: string;
}

export type NotificationStatus = "pending" | "sent" | "unconfigured";

export interface NotificationRecord {
  inquiryId: string;
  status: NotificationStatus;
  attempts: number;
  nextAttemptAt: string | null;
  lastError: string | null;
  updatedAt: string;
}

export interface SubmissionClaim {
  submissionId: string;
  inquiryId: string;
  fingerprint: string;
}

export const SCAN_REFERENCE_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;
export const SUBMISSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,80}$/;
export const INQUIRY_ID_PATTERN = /^inq_[a-f0-9]{32}$/;

const RULE_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,80}$/;
const CHECK_STATES = new Set<SeoCheckState>(["pass", "confirm", "unknown", "not_applicable"]);
const RUN_STATUSES = new Set<SeoRunStatus>(["completed", "partial", "unavailable"]);

export function isScanReference(value: string): boolean {
  return SCAN_REFERENCE_PATTERN.test(value) && !value.includes("..");
}

export function isSubmissionId(value: string): boolean {
  return SUBMISSION_ID_PATTERN.test(value);
}

export function isInquiryId(value: string): boolean {
  return INQUIRY_ID_PATTERN.test(value);
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function isHttpUrl(value: string): boolean {
  if (value.length > 2000) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function clip(value: string, max: number): string {
  const cleaned = value.replace(/\u0000/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, Math.max(0, max - 1))}…`;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) return null;
  return value;
}

/**
 * Copy a directory snapshot into the allowlisted inquiry shape.
 * Returns null when the directory payload cannot be trusted.
 */
export function copyScanSnapshot(reference: string, input: unknown): SeoScanSnapshot | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  const sourceReference = readString(source.reference);
  if (!sourceReference || sourceReference !== reference || !isScanReference(reference)) return null;

  const canonicalUrl = readString(source.canonicalUrl);
  const finalUrl = readString(source.finalUrl);
  const checkedAt = readString(source.checkedAt);
  const ruleVersion = readString(source.ruleVersion);
  const locale = source.locale;
  const status = source.status;
  const cacheExpiresAt = readString(source.cacheExpiresAt);
  if (!canonicalUrl || !isHttpUrl(canonicalUrl)) return null;
  if (!finalUrl || !isHttpUrl(finalUrl)) return null;
  if (!checkedAt || !isIsoDate(checkedAt)) return null;
  if (!ruleVersion || ruleVersion.trim().length === 0 || ruleVersion.length > 80) return null;
  if (locale !== "en" && locale !== "zh") return null;
  if (typeof status !== "string" || !RUN_STATUSES.has(status as SeoRunStatus)) return null;
  if (typeof source.cacheHit !== "boolean") return null;
  if (!cacheExpiresAt || !isIsoDate(cacheExpiresAt)) return null;

  const coverageSource = source.coverage;
  if (!coverageSource || typeof coverageSource !== "object") return null;
  const coverageRecord = coverageSource as Record<string, unknown>;
  const completed = readCount(coverageRecord.completed);
  const unknown = readCount(coverageRecord.unknown);
  const notApplicable = readCount(coverageRecord.notApplicable);
  if (completed === null || unknown === null || notApplicable === null) return null;

  if (!Array.isArray(source.checks) || source.checks.length > 12) return null;
  const checks: SeoCheckItem[] = [];
  for (const item of source.checks) {
    if (!item || typeof item !== "object") return null;
    const check = item as Record<string, unknown>;
    const ruleId = readString(check.ruleId);
    const checkVersion = readString(check.ruleVersion);
    const state = check.state;
    const url = readString(check.url);
    const observed = readString(check.observed);
    if (!ruleId || !RULE_ID_PATTERN.test(ruleId)) return null;
    if (!checkVersion || checkVersion.length > 80) return null;
    if (typeof state !== "string" || !CHECK_STATES.has(state as SeoCheckState)) return null;
    if (!url || !isHttpUrl(url)) return null;
    if (observed === null) return null;
    checks.push({
      ruleId,
      ruleVersion: clip(checkVersion, 80),
      state: state as SeoCheckState,
      url,
      observed: clip(observed, 240),
    });
  }

  if (!Array.isArray(source.findings) || source.findings.length > 2) return null;
  const findings: SeoDisplayedFinding[] = [];
  for (const item of source.findings) {
    if (!item || typeof item !== "object") return null;
    const finding = item as Record<string, unknown>;
    const ruleId = readString(finding.ruleId);
    const findingVersion = readString(finding.ruleVersion);
    const url = readString(finding.url);
    const observed = readString(finding.observed);
    const evidence = readString(finding.evidence);
    const findingCheckedAt = readString(finding.checkedAt);
    const reason = readString(finding.reason);
    const suggestion = readString(finding.suggestion);
    if (!ruleId || !RULE_ID_PATTERN.test(ruleId)) return null;
    if (!findingVersion || findingVersion.length > 80) return null;
    if (!url || !isHttpUrl(url)) return null;
    if (observed === null || evidence === null || reason === null || suggestion === null) return null;
    if (!findingCheckedAt || !isIsoDate(findingCheckedAt)) return null;
    findings.push({
      ruleId,
      ruleVersion: clip(findingVersion, 80),
      url,
      observed: clip(observed, 240),
      evidence: clip(evidence, 240),
      checkedAt: findingCheckedAt,
      reason: clip(reason, 400),
      suggestion: clip(suggestion, 400),
    });
  }

  return {
    reference,
    canonicalUrl,
    finalUrl,
    checkedAt,
    ruleVersion: clip(ruleVersion, 80),
    locale,
    status: status as SeoRunStatus,
    cacheHit: source.cacheHit,
    cacheExpiresAt,
    coverage: { completed, unknown, notApplicable },
    checks,
    findings,
  };
}
