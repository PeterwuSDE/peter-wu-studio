import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createBlobInquiryStore } from "../lib/seo/blob-inquiry-store.ts";
import type { InquiryRecord } from "../lib/seo/inquiry-store.ts";
import { sweepDueNotifications, type InquiryDeps } from "../lib/seo/inquiry-service.ts";

// Only the external SDK is replaced: pagination, persistence, retention, and
// notification delivery all run through the production adapters and service.
test("blob pagination resumes bounded maintenance to reach a due notification and expired inquiry after the first 1000 objects without delaying pending work behind sent history", async () => {
  const objects = new Map<string, string>();
  const sdk = mock.module("@vercel/blob", {
    namedExports: {
      async put(pathname: string, body: string, options: { allowOverwrite: boolean; access: string }) {
        assert.equal(options.access, "private");
        if (!options.allowOverwrite && objects.has(pathname)) throw new Error("Blob already exists");
        objects.set(pathname, body);
      },
      async get(pathname: string) {
        const body = objects.get(pathname);
        return body === undefined ? null : { statusCode: 200, stream: new Response(body).body };
      },
      async del(pathname: string) { objects.delete(pathname); },
      async list({ prefix, cursor, limit }: { prefix: string; cursor?: string; limit: number }) {
        const paths = [...objects.keys()].filter((path) => path.startsWith(prefix) && (!cursor || path > cursor)).sort();
        const page = paths.slice(0, limit);
        const hasMore = limit < paths.length;
        return { blobs: page.map((pathname) => ({ pathname })), hasMore, cursor: hasMore ? page.at(-1) : undefined };
      },
    },
  });
  try {
    const { createVercelBlobClient } = await import("../lib/seo/vercel-blob-client.ts");
    const client = createVercelBlobClient();
    const store = createBlobInquiryStore(client);
    const record = (index: number): InquiryRecord => ({
      inquiryId: `inq_${index.toString(16).padStart(32, "0")}`,
      requestId: `inquiry-request-${index.toString().padStart(4, "0")}`,
      scanId: "scan_home_01",
      snapshot: {
        scanId: "scan_home_01", requestId: "scan-request-0001", normalizedUrl: "https://example.com/",
        finalUrl: "https://example.com/", locale: "en", checkedAt: "2026-01-01T00:00:00.000Z",
        ruleVersion: "homepage-2026-10-29.1", cached: false, cacheExpiresAt: "2026-01-02T00:00:00.000Z",
        status: "completed", code: "ok", message: "Checked.", scope: "One homepage.",
        coverage: { completed: 0, unknown: 0, notApplicable: 0, total: 0 }, findings: [], rules: [],
        siteName: "Example", javascriptNotExecuted: false, redirectCount: 0, httpStatus: 200,
      },
      name: "Ada", email: "ada@example.com", goal: "Fix the homepage", phone: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      deleteAt: index === 1000 ? "2026-01-02T00:00:00.000Z" : "2026-04-01T00:00:00.000Z",
    });
    for (let index = 0; index < 1003; index += 1) {
      const inquiry = record(index);
      await store.claimSubmission({ requestId: inquiry.requestId, inquiryId: inquiry.inquiryId, fingerprint: "test-fingerprint" });
      await store.putInquiry(inquiry);
      await store.putNotification({
        inquiryId: inquiry.inquiryId, status: index === 1002 ? "pending" : "sent", attempts: 1,
        nextAttemptAt: null, lastError: null,
      });
    }
    assert.equal((await store.listInquiries()).length, 1003);
    assert.equal((await store.listNotifications()).length, 1003);
    const sent: string[] = [];
    const deps: InquiryDeps = {
      store, now: () => new Date("2026-01-03T00:00:00.000Z"), retentionDays: 90, rateLimitPerHour: 10,
      scanDirectory: { async lookup() { throw new Error("Retry must use persisted snapshots"); } },
      notifier: { async send(inquiry) { sent.push(inquiry.inquiryId); return { status: "sent" }; } },
    };
    const first = await sweepDueNotifications(deps);
    assert.equal(first.sent, 1);
    assert.deepEqual(sent, ["inq_000000000000000000000000000003ea"]);
    for (let run = 0; run < 45 && await store.getInquiry(record(1000).inquiryId); run += 1) {
      await sweepDueNotifications({ ...deps, store: createBlobInquiryStore(createVercelBlobClient()) });
    }
    assert.equal(await store.getInquiry(record(1000).inquiryId), null);
    assert.equal(await store.getNotification(record(1000).inquiryId), null);
    assert.equal(await store.getSubmission(record(1000).requestId), null);
    assert.equal((await store.getNotification(record(1002).inquiryId))?.status, "sent");
  } finally {
    sdk.restore();
  }
});
