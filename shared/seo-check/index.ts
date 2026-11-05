/**
 * Server entry for the homepage SEO check.
 * Browser and React code should import `shared/seo-check/contract.ts` instead.
 */

export {
  CHECK_STATUS_LABELS,
  CHECKLIST_ORDER,
  FINDING_PRIORITY,
  JAVASCRIPT_NOT_EXECUTED_MESSAGE,
  NO_PRIORITY_FINDINGS_MESSAGE,
  PRIORITY_FINDING_SIGNALS,
  RULE_SIGNALS,
  RULE_STATUS_LABELS,
  SEO_CHECK_MAX_URL_LENGTH,
  SEO_CHECK_PATH,
  SEO_CHECK_REQUEST_ID_PATTERN,
  SEO_CHECK_RULE_VERSION,
  SEO_CHECK_SCOPE,
  SEO_INQUIRY_PATH,
  coverageFrom,
  emptyCoverage,
  escapeHtml,
  httpStatusFor,
  normalizeLocale,
  sanitizePlainText,
} from "./contract.ts";
export type {
  Evaluation,
  RuleFact,
  RuleId,
  RuleStatus,
  SeoCheckCode,
  SeoCheckCoverage,
  SeoCheckLocale,
  SeoCheckResponse,
  SeoCheckStatus,
  SeoFinding,
  SeoInquiryRecord,
  SeoInquiryRequest,
  SeoInquiryResponse,
  SeoNotificationRecord,
  SeoNotificationStatus,
  SeoRuleResult,
  SeoScanSnapshot,
} from "./contract.ts";

export { DEFAULT_CONFIG, configFromEnv } from "./config.ts";
export type { SeoCheckConfig } from "./config.ts";
export { createFileStore, createMemoryStore, getDefaultStore, resetDefaultStoreForTests } from "./store.ts";
export type { SeoCheckStore, StoredScan } from "./store.ts";
export { createScanId, readStoredScan, runSeoCheck } from "./service.ts";
export type { SeoCheckDeps } from "./service.ts";
export { clientAddress, handleSeoCheckRequest, productionDeps } from "./http.ts";
export { isPublicIp, normalizePublicUrl } from "./network-policy.ts";
export { createNodeConnector, createNodeResolver, createPinnedLookup } from "./node-transport.ts";
