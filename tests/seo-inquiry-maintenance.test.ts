import assert from "node:assert/strict";
import test from "node:test";
import { createBlobInquiryStore, MapBlobClient } from "../lib/seo/blob-inquiry-store.ts";
import type { InquiryRecord } from "../lib/seo/inquiry-store.ts";
import { createInquiry, sweepDueNotifications, type InquiryDeps } from "../lib/seo/inquiry-service.ts";

const ROOT = "seo-inquiries";
const CURSOR = `${ROOT}/maintenance/notifications.json`;
const inquiry = (index: number): InquiryRecord => ({
  inquiryId: `inq_${index.toString(16).padStart(32, "0")}`,
  requestId: `inquiry-request-${index.toString().padStart(4, "0")}`, scanId: "scan_home_01",
  snapshot: {
    scanId: "scan_home_01", requestId: "scan-request-0001", normalizedUrl: "https://example.com/", finalUrl: "https://example.com/",
    locale: "en", checkedAt: "2026-01-01T00:00:00.000Z", ruleVersion: "homepage-2026-10-29.1", cached: false,
    cacheExpiresAt: "2026-01-02T00:00:00.000Z", status: "completed", code: "ok", message: "Checked.", scope: "One homepage.",
    coverage: { completed: 0, unknown: 0, notApplicable: 0, total: 0 }, findings: [], rules: [], siteName: "Example",
    javascriptNotExecuted: false, redirectCount: 0, httpStatus: 200,
  },
  name: "Ada", email: "ada@example.com", goal: "Fix the homepage", phone: null,
  createdAt: "2026-01-01T00:00:00.000Z", deleteAt: "2026-04-01T00:00:00.000Z",
});

class ObservedBlobClient extends MapBlobClient {
  reads: string[] = [];
  lists = 0;
  operations = 0;
  failRead: string | null = null;
  failWrite: string | null = null;
  failDelete: string | null = null;
  failAfterWrite: string | null = null;
  override async get(path: string) {
    this.operations += 1;
    this.reads.push(path);
    if (path === this.failRead) throw new Error("temporary Blob read failure");
    return super.get(path);
  }
  override async put(path: string, body: string, options: { allowOverwrite: boolean }) {
    this.operations += 1;
    if (path === this.failWrite) throw new Error("temporary Blob write failure");
    await super.put(path, body, options);
    if (path === this.failAfterWrite) throw new Error("Blob committed but write response was lost");
  }
  override async del(path: string) {
    this.operations += 1;
    if (path === this.failDelete) throw new Error("temporary Blob delete failure");
    return super.del(path);
  }
  override async list(prefix: string) { this.lists += 1; return super.list(prefix); }
  reset() { this.reads = []; this.lists = 0; this.operations = 0; }
}

async function seed(client: ObservedBlobClient, count: number, pending: number[] = [], start = 0) {
  const store = createBlobInquiryStore(client);
  for (let index = start; index < start + count; index += 1) {
    const record = inquiry(index);
    if (index === 1000) record.deleteAt = "2026-01-02T00:00:00.000Z";
    await store.putInquiry(record);
    await store.claimSubmission({ requestId: record.requestId, inquiryId: record.inquiryId, fingerprint: "fixture" });
    await store.putNotification({ inquiryId: record.inquiryId, status: pending.includes(index) ? "pending" : "sent", attempts: 1, nextAttemptAt: null, lastError: null });
  }
  client.reset();
}

function deps(client: ObservedBlobClient, sent: string[] = []): InquiryDeps {
  return {
    store: createBlobInquiryStore(client), now: () => new Date("2026-01-03T00:00:00.000Z"), retentionDays: 90, rateLimitPerHour: 10,
    scanDirectory: { async lookup() { return { status: "verified", snapshot: inquiry(0).snapshot }; } },
    notifier: { async send(record) { sent.push(record.inquiryId); return { status: "sent" }; } },
  };
}

test("pending work bypasses 1002 sent records while retention resumes across bounded invocations", async () => {
  const client = new ObservedBlobClient();
  await seed(client, 1003, [1002]);
  const sent: string[] = [];
  await sweepDueNotifications(deps(client, sent));
  assert.deepEqual(sent, [inquiry(1002).inquiryId], "sent history must not delay the pending queue");
  for (let run = 0; run < 45 && client.objects.has(`${ROOT}/records/${inquiry(1000).inquiryId}.json`); run += 1) {
    client.reset();
    await sweepDueNotifications(deps(client, sent));
    assert.ok(client.reads.filter((path) => path.includes("/records/")).length <= 45, "a retry must read at most 25 retention records and 20 delivery/lease-validation records");
    assert.ok(client.operations * 20 <= 5000, "20ms Blob operations must fit a bounded five-second IO budget");
  }
  assert.deepEqual(sent, [inquiry(1002).inquiryId]);
  assert.equal(await deps(client).store?.getInquiry(inquiry(1000).inquiryId), null);
  assert.equal(await deps(client).store?.getSubmission(inquiry(1000).requestId), null);
  assert.equal(await deps(client).store?.getNotification(inquiry(1000).inquiryId), null);
});

test("Blob creation never scans retained inquiry or notification collections", async () => {
  const client = new ObservedBlobClient();
  await seed(client, 1002);
  const result = await createInquiry({ scanId: "scan_home_01", requestId: "inquiry-request-new1", name: "Ada", email: "ada@example.com", goal: "Fix homepage", locale: "en" }, deps(client));
  assert.equal(result.ok, true);
  assert.equal(client.lists, 0);
  assert.ok(client.reads.length < 15, "submission work must be independent of retained collection size");
});

test("failed retention reads preserve the durable maintenance position", async () => {
  const client = new ObservedBlobClient();
  await seed(client, 30);
  const cursorPath = `${ROOT}/maintenance/inquiries.json`;
  const before = client.objects.get(cursorPath);
  client.failRead = `${ROOT}/records/${inquiry(5).inquiryId}.json`;
  await assert.rejects(sweepDueNotifications(deps(client)), /temporary Blob read failure/);
  assert.equal(client.objects.get(cursorPath), before);
  client.failRead = null;
  client.reset();
  await sweepDueNotifications(deps(client));
  assert.ok(client.reads.includes(`${ROOT}/records/${inquiry(0).inquiryId}.json`));
  assert.notEqual(client.objects.get(cursorPath), before);
});

test("failed notification processing preserves its cursor and reprocesses the same page", async () => {
  const client = new ObservedBlobClient();
  await seed(client, 30, [0]);
  const before = client.objects.get(CURSOR);
  client.failWrite = `${ROOT}/notifications/sent/${inquiry(0).inquiryId}.json`;
  await assert.rejects(sweepDueNotifications(deps(client)), /temporary Blob write failure/);
  assert.equal(client.objects.get(CURSOR), before);
  client.failWrite = null;
  client.reset();
  const sent: string[] = [];
  await sweepDueNotifications(deps(client, sent));
  assert.deepEqual(sent, [inquiry(0).inquiryId]);
  assert.notEqual(client.objects.get(CURSOR), before);
});

test("bounded notification pages do not skip due overflow and cycle after reaching the end", async () => {
  const client = new ObservedBlobClient();
  await seed(client, 25, Array.from({ length: 25 }, (_, index) => index + 10), 10);
  const sent: string[] = [];
  for (let run = 0; run < 3; run += 1) {
    const summary = await sweepDueNotifications(deps(client, sent));
    assert.ok(summary.sent <= 10);
  }
  assert.equal(new Set(sent).size, 25);
  assert.equal((await deps(client).store?.listNotifications())?.filter((note) => note.status === "sent").length, 25);
  // A new unsent ID sorts before the previous cursor and must be seen after
  // the end-of-queue cursor resets.
  await deps(client).store?.putInquiry(inquiry(0));
  await deps(client).store?.putNotification({ inquiryId: inquiry(0).inquiryId, status: "pending", attempts: 0, nextAttemptAt: null, lastError: null });
  assert.equal((await sweepDueNotifications(deps(client, sent))).sent, 1);
});

test("Blob replay refuses an expired record before its retention page is reached", async () => {
  const client = new ObservedBlobClient();
  await seed(client, 1002);
  const env = deps(client);
  const body = { scanId: "scan_home_01", requestId: "inquiry-request-expired", name: "Ada", email: "ada@example.com", goal: "Fix homepage", locale: "en" };
  const created = await createInquiry(body, env);
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const record = await env.store?.getInquiry(created.inquiryId);
  assert.ok(record);
  record.deleteAt = "2026-01-02T00:00:00.000Z";
  await env.store?.putInquiry(record);
  const replay = await createInquiry(body, env);
  assert.deepEqual(replay, { ok: false, error: "save_failed" });
});

test("an expired notification encountered ahead of retention progress is never sent", async () => {
  const client = new ObservedBlobClient();
  await seed(client, 1002, [1001]);
  const expired = inquiry(1001);
  expired.deleteAt = "2026-01-02T00:00:00.000Z";
  const env = deps(client);
  await env.store?.putInquiry(expired);
  const sent: string[] = [];
  await sweepDueNotifications(deps(client, sent));
  assert.deepEqual(sent, []);
  assert.equal(await env.store?.getInquiry(expired.inquiryId), null);
});


test("failed retention cleanup preserves its record anchor and does not advance the page", async () => {
  const client = new ObservedBlobClient();
  await seed(client, 30);
  const expired = inquiry(0);
  expired.deleteAt = "2026-01-02T00:00:00.000Z";
  await deps(client).store?.putInquiry(expired);
  const cursorPath = `${ROOT}/maintenance/inquiries.json`;
  const before = client.objects.get(cursorPath);
  client.failDelete = `${ROOT}/records/${expired.inquiryId}.json`;
  await assert.rejects(sweepDueNotifications(deps(client)), /temporary Blob delete failure/);
  assert.equal(client.objects.get(cursorPath), before);
  assert.ok(await deps(client).store?.getInquiry(expired.inquiryId));
  client.failDelete = null;
  await sweepDueNotifications(deps(client));
  assert.equal(await deps(client).store?.getInquiry(expired.inquiryId), null);
  assert.equal(await deps(client).store?.getNotification(expired.inquiryId), null);
  assert.equal(await deps(client).store?.getSubmission(expired.requestId), null);
  assert.notEqual(client.objects.get(cursorPath), before);
});


test("an uncertain sent-marker write leaves a dominant receipt and cannot resend its pending entry", async () => {
  const client = new ObservedBlobClient();
  await seed(client, 30, [0]);
  const sent: string[] = [];
  const sentPath = `${ROOT}/notifications/sent/${inquiry(0).inquiryId}.json`;
  const pendingPath = `${ROOT}/notifications/pending/${inquiry(0).inquiryId}.json`;
  client.failAfterWrite = sentPath;
  await assert.rejects(sweepDueNotifications(deps(client, sent)), /write response was lost/);
  assert.deepEqual(sent, [inquiry(0).inquiryId]);
  assert.equal((await deps(client).store?.getNotification(inquiry(0).inquiryId))?.status, "sent");
  assert.ok(client.objects.has(pendingPath), "an ambiguous receipt may leave the queue entry behind");
  client.failAfterWrite = null;
  await sweepDueNotifications(deps(client, sent));
  assert.deepEqual(sent, [inquiry(0).inquiryId], "the persisted sent marker prevents another email");
  assert.equal(client.objects.has(pendingPath), false);
  assert.equal((await deps(client).store?.listNotifications())?.length, 30);
});
