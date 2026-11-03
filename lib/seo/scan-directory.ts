import type { ScanDirectory, ScanLookupResult } from "./contract.ts";

/**
 * Issue #3 integration point.
 *
 * Replace the body of `createScanDirectory` with a directory that reads #3's
 * scan store and returns `ScanLookupResult`. Keep the lookup server-side.
 * A missing or expired reference must not fall back to facts posted by the browser.
 *
 * Expected wiring:
 *
 *   export function createScanDirectory(): ScanDirectory {
 *     return createIssue3ScanDirectory();
 *   }
 */
export function createRejectingScanDirectory(): ScanDirectory {
  return {
    async lookup(): Promise<ScanLookupResult> {
      return { status: "not_found" };
    },
  };
}

export function createScanDirectory(): ScanDirectory {
  return createRejectingScanDirectory();
}
