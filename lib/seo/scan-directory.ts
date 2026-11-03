import {
  normalizeLocale,
  type SeoCheckLocale,
  type SeoScanSnapshot,
} from "../../shared/seo-check/contract.ts";
import { readStoredScan, type SeoCheckDeps } from "../../shared/seo-check/service.ts";

/** Matches scan ids issued by the homepage check, including `scan_` + base64url. */
export const SCAN_ID_PATTERN = /^[A-Za-z0-9_-]{8,200}$/;

export type ScanLookupResult =
  | { status: "verified"; snapshot: SeoScanSnapshot }
  | { status: "not_found" }
  | { status: "invalid" };

export interface ScanDirectory {
  /**
   * Rebuild the snapshot the visitor can still be tied to.
   * `readStoredScan` returns null once the scan's retention window has passed,
   * which is the same result as an unknown id: the reference can no longer be verified.
   */
  lookup(scanId: string, now: Date, locale: SeoCheckLocale): Promise<ScanLookupResult>;
}

/**
 * Live directory for issue #3. Pass `store` and `now` from tests.
 * Production uses the same default scan store as POST /api/seo-check.
 */
export function createScanDirectory(deps: Pick<SeoCheckDeps, "store" | "now" | "config"> = {}): ScanDirectory {
  return {
    async lookup(scanId, now, locale) {
      if (!SCAN_ID_PATTERN.test(scanId)) return { status: "invalid" };
      const renderedLocale = normalizeLocale(locale) ?? "en";
      const snapshot = await readStoredScan(scanId, renderedLocale, {
        store: deps.store,
        now: deps.now ?? (() => now.getTime()),
        config: deps.config,
      });
      if (!snapshot || snapshot.scanId !== scanId) return { status: "not_found" };
      return { status: "verified", snapshot };
    },
  };
}
