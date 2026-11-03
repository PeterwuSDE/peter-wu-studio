/**
 * Client contract for POST /api/seo-check.
 *
 * This module is the only place the homepage check UI names the wire
 * format. Issue #3 owns the server and the shared types. At integration,
 * replace this module with those types and keep `interpretSeoCheck` as the
 * boundary that refuses to invent a report.
 *
 * Assumptions until that shared module exists:
 * - JSON is camelCase.
 * - Request body is `{ url, locale, requestId }`.
 * - `locale` is `en` or `zh`.
 * - A usable check returns `status` `complete` or `partial` plus `scanRef`,
 *   `normalizedUrl`, `finalUrl`, `checkedAt`, `ruleVersion`, `cached`,
 *   `coverage`, and `findings` (zero to two).
 * - `checkedAt` is the original check time, including when `cached` is true.
 * - Item status is `pass`, `review`, `unknown`, or `not_applicable`.
 *   Unknown and not applicable are not failures. `review` is not rendered
 *   as an extra finding; the server chooses at most two findings.
 * - Expected rule ids: https, title, description, h1, indexing, canonical,
 *   viewport, image_alt. Unknown ids are shown as plain text.
 * - Page-read failures use `rejected`, `unreadable`, or `unavailable` and
 *   do not become SEO conclusions.
 */

export const SEO_CHECK_PATH = "/api/seo-check";
export const SEO_CHECK_CONTRACT_VERSION = "2026-10-29";

export type SeoCheckLocale = "en" | "zh";

export type SeoCheckRequest = {
  url: string;
  locale: SeoCheckLocale;
  requestId: string;
};

export type SeoSignalStatus = "pass" | "review" | "unknown" | "not_applicable";

export type SeoRunStatus = "complete" | "partial" | "unreadable" | "rejected" | "unavailable";

export type SeoBlockReason =
  | "invalid_url"
  | "network"
  | "access_restricted"
  | "unsupported_document"
  | "quota"
  | "service";

export type SeoFinding = {
  ruleId: string;
  ruleVersion: string;
  url: string;
  evidence: string;
  checkedAt: string;
  condition: string;
  explanation: string;
  suggestions: string[];
};

export type SeoCheckItem = {
  ruleId: string;
  status: SeoSignalStatus;
  summary: string | null;
};

export type SeoCoverage = {
  completed: number;
  unknown: number;
  notApplicable: number;
};

export type SeoCheckReport = {
  status: "complete" | "partial";
  scanRef: string;
  requestId: string;
  normalizedUrl: string;
  finalUrl: string;
  locale: SeoCheckLocale;
  checkedAt: string;
  ruleVersion: string;
  cached: boolean;
  cacheExpiresAt: string | null;
  coverage: SeoCoverage;
  findings: SeoFinding[];
  items: SeoCheckItem[];
  javascriptNotExecuted: boolean;
  unsupportedDocument: boolean;
  displayName: string | null;
};

export type SeoCheckBlock = {
  reason: SeoBlockReason;
  requestId: string;
};

export type SeoCheckOutcome =
  | { kind: "report"; report: SeoCheckReport }
  | { kind: "blocked"; block: SeoCheckBlock };

export type SeoCheckTransport = {
  httpStatus: number | null;
  body: unknown;
};

const RUN_STATUS = new Set<SeoRunStatus>(["complete", "partial", "unreadable", "rejected", "unavailable"]);

function isRunStatus(value: string): value is SeoRunStatus {
  return RUN_STATUS.has(value as SeoRunStatus);
}
const ITEM_STATUS = new Set<SeoSignalStatus>(["pass", "review", "unknown", "not_applicable"]);
const LOCALES = new Set<SeoCheckLocale>(["en", "zh"]);

const MAX_FINDINGS = 2;
const MAX_SUGGESTIONS = 2;
const MAX_ITEMS = 16;

export function interpretSeoCheck(transport: SeoCheckTransport, request: SeoCheckRequest): SeoCheckOutcome {
  const parsed = parseBody(transport.body, request);
  if (parsed) return parsed;
  return { kind: "blocked", block: { reason: reasonFromStatus(transport.httpStatus), requestId: request.requestId } };
}

function parseBody(body: unknown, request: SeoCheckRequest): SeoCheckOutcome | null {
  const record = asRecord(body);
  if (!record) return null;
  const status = record.status;
  if (typeof status !== "string" || !isRunStatus(status)) return null;
  const requestId = cleanToken(record.requestId, 80) ?? request.requestId;

  if (status === "complete" || status === "partial") {
    const report = parseReport(record, status, request, requestId);
    if (!report) return { kind: "blocked", block: { reason: "service", requestId } };
    return { kind: "report", report };
  }

  const reason = blockReason(record.reason, status);
  if (!reason) return { kind: "blocked", block: { reason: "service", requestId } };
  return { kind: "blocked", block: { reason, requestId } };
}

function parseReport(
  record: Record<string, unknown>,
  status: "complete" | "partial",
  request: SeoCheckRequest,
  requestId: string,
): SeoCheckReport | null {
  const scanRef = cleanScanRef(record.scanRef);
  const normalizedUrl = cleanHttpUrl(record.normalizedUrl);
  const finalUrl = cleanHttpUrl(record.finalUrl);
  const checkedAt = cleanTime(record.checkedAt);
  const ruleVersion = cleanRuleVersion(record.ruleVersion);
  const coverage = parseCoverage(record.coverage);
  if (!scanRef || !normalizedUrl || !finalUrl || !checkedAt || !ruleVersion || !coverage) return null;
  if (typeof record.cached !== "boolean") return null;
  if (!Array.isArray(record.findings) || !Array.isArray(record.items ?? [])) return null;

  const locale = LOCALES.has(record.locale as SeoCheckLocale) ? record.locale as SeoCheckLocale : request.locale;
  const findings = record.findings
    .map(parseFinding)
    .filter((finding): finding is SeoFinding => finding !== null)
    .slice(0, MAX_FINDINGS);
  const items = (Array.isArray(record.items) ? record.items : [])
    .map(parseItem)
    .filter((item): item is SeoCheckItem => item !== null)
    .slice(0, MAX_ITEMS);

  const javascriptNotExecuted = record.javascriptNotExecuted === true || record.reason === "javascript_not_executed";
  const unsupportedDocument = record.reason === "unsupported_document" || record.unsupportedDocument === true;

  return {
    status,
    scanRef,
    requestId,
    normalizedUrl,
    finalUrl,
    locale,
    checkedAt,
    ruleVersion,
    cached: record.cached,
    cacheExpiresAt: cleanTime(record.cacheExpiresAt),
    coverage,
    findings,
    items,
    javascriptNotExecuted,
    unsupportedDocument,
    displayName: cleanText(record.displayName, 80),
  };
}

function parseFinding(value: unknown): SeoFinding | null {
  const record = asRecord(value);
  if (!record) return null;
  const ruleId = cleanRuleId(record.ruleId);
  const ruleVersion = cleanRuleVersion(record.ruleVersion);
  const url = cleanHttpUrl(record.url);
  const evidence = cleanText(record.evidence, 500);
  const checkedAt = cleanTime(record.checkedAt);
  const condition = cleanText(record.condition, 400);
  const explanation = cleanText(record.explanation, 600);
  if (!ruleId || !ruleVersion || !url || !evidence || !checkedAt || !condition || !explanation) return null;
  if (!Array.isArray(record.suggestions)) return null;
  const suggestions = record.suggestions
    .map((suggestion) => cleanText(suggestion, 400))
    .filter((suggestion): suggestion is string => suggestion !== null)
    .slice(0, MAX_SUGGESTIONS);
  if (suggestions.length === 0) return null;
  return { ruleId, ruleVersion, url, evidence, checkedAt, condition, explanation, suggestions };
}

function parseItem(value: unknown): SeoCheckItem | null {
  const record = asRecord(value);
  if (!record) return null;
  const ruleId = cleanRuleId(record.ruleId);
  const status = record.status;
  if (!ruleId || typeof status !== "string" || !ITEM_STATUS.has(status as SeoSignalStatus)) return null;
  return { ruleId, status: status as SeoSignalStatus, summary: cleanText(record.summary, 300) };
}

function parseCoverage(value: unknown): SeoCoverage | null {
  const record = asRecord(value);
  if (!record) return null;
  const completed = cleanCount(record.completed);
  const unknown = cleanCount(record.unknown);
  const notApplicable = cleanCount(record.notApplicable);
  if (completed === null || unknown === null || notApplicable === null) return null;
  return { completed, unknown, notApplicable };
}

function blockReason(value: unknown, status: SeoRunStatus): SeoBlockReason | null {
  if (value === "invalid_url" || value === "network" || value === "access_restricted" || value === "unsupported_document" || value === "quota") {
    return value;
  }
  if (status === "rejected") return "invalid_url";
  if (status === "unavailable") return "quota";
  if (status === "unreadable") return "network";
  return null;
}

function reasonFromStatus(status: number | null): SeoBlockReason {
  if (status === 400 || status === 422) return "invalid_url";
  if (status === 413) return "unsupported_document";
  if (status === 429) return "quota";
  return "service";
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

function cleanToken(value: unknown, max: number): string | null {
  const text = cleanText(value, max);
  if (!text || /\s/.test(text)) return null;
  return text;
}

function cleanScanRef(value: unknown): string | null {
  const text = cleanToken(value, 200);
  if (!text || text.length < 6 || !/^[A-Za-z0-9._:~-]+$/.test(text)) return null;
  return text;
}

function cleanRuleId(value: unknown): string | null {
  const text = cleanToken(value, 40);
  if (!text || !/^[a-z0-9_-]+$/.test(text)) return null;
  return text;
}

function cleanRuleVersion(value: unknown): string | null {
  const text = cleanToken(value, 40);
  if (!text || !/^[A-Za-z0-9._-]+$/.test(text)) return null;
  return text;
}

function cleanHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2000 || /[\s<>]/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
  } catch {
    return null;
  }
  return trimmed;
}

function cleanTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  if (Number.isNaN(Date.parse(value))) return null;
  return value;
}

function cleanCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) return null;
  return value;
}
