import assert from "node:assert/strict";
import test from "node:test";
import { seoInquiryHref } from "../lib/seo/inquiry-href.ts";
import { createBlobInquiryStore, MapBlobClient } from "../lib/seo/blob-inquiry-store.ts";
import type { SeoScanSnapshot } from "../shared/seo-check/contract.ts";
import { createMemoryStore } from "../shared/seo-check/store.ts";
import { readStoredScan, runSeoCheck } from "../shared/seo-check/service.ts";
import { handleInquiryHttp, type HttpDeps } from "../lib/seo/http.ts";
import { MemoryInquiryStore } from "../lib/seo/inquiry-store.ts";
import { createInquiry, deleteInquiry, fingerprintInquiry, sweepDueNotifications, type InquiryDeps } from "../lib/seo/inquiry-service.ts";
import { createNotifierFromEnv, createResendNotifier, createUnconfiguredNotifier } from "../lib/seo/notifier.ts";
import { blobCredentialsConfigured, inquirySettings } from "../lib/seo/production.ts";
import { createScanDirectory, type ScanDirectory, type ScanLookupResult } from "../lib/seo/scan-directory.ts";
import { clock, htmlResult, pageHtml, publicResolver, requestId, scriptedConnector } from "./seo-check/helpers.ts";

const SCAN = "scan_home_01";
const REQUEST = "inquiry-request-0001";
const EMAIL = "ada@example.com";
const NAME = "Ada North";
const GOAL = "Fix the homepage title";
const PHONE = "555-0100";

function snapshot(overrides: Partial<SeoScanSnapshot> = {}): SeoScanSnapshot {
  return {
    scanId: SCAN,
    requestId: "req_scan_0001",
    normalizedUrl: "https://example.com/",
    finalUrl: "https://example.com/home",
    locale: "en",
    checkedAt: "2025-12-31T12:00:00.000Z",
    ruleVersion: "homepage-2026-10-29.1",
    cached: false,
    cacheExpiresAt: "2026-01-01T12:00:00.000Z",
    status: "completed",
    code: "ok",
    message: "The homepage check finished.",
    scope: "One public homepage.",
    coverage: { completed: 6, unknown: 1, notApplicable: 1, total: 8 },
    findings: [{
      ruleId: "description",
      ruleVersion: "homepage-2026-10-29.1",
      url: "https://example.com/",
      evidence: "no meta description",
      checkedAt: "2025-12-31T12:00:00.000Z",
      reason: "A search engine may write its own snippet.",
      condition: "If this homepage should describe itself.",
      suggestions: ["Add a short description."],
      signal: "missing",
    }],
    rules: [{
      ruleId: "title",
      ruleVersion: "homepage-2026-10-29.1",
      status: "pass",
      signal: "present",
      evidence: "Example",
      summary: "A title is present.",
    }],
    siteName: "Example",
    javascriptNotExecuted: false,
    redirectCount: 0,
    httpStatus: 200,
    ...overrides,
  };
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    scanId: SCAN,
    requestId: REQUEST,
    name: NAME,
    email: EMAIL,
    goal: GOAL,
    phone: PHONE,
    locale: "en",
    marketingOptIn: true,
    normalizedUrl: "https://evil.example/override",
    ruleVersion: "client-tampered",
    findings: [{ evidence: "tampered" }],
    ...overrides,
  };
}

function harness(options: {
  lookup?: ScanLookupResult | ((scanId: string, now: Date, locale: "en" | "zh") => ScanLookupResult | Promise<ScanLookupResult>);
  notify?: (calls: number) => { status: "sent" } | { status: "not_configured" } | { status: "failed"; errorCode: string };
  now?: Date;
  retentionDays?: number;
  rateLimitPerHour?: number;
  store?: MemoryInquiryStore | null;
} = {}) {
  const store = options.store === undefined ? new MemoryInquiryStore() : options.store;
  const sends: unknown[] = [];
  const lookups: string[] = [];
  const logs: unknown[] = [];
  let now = options.now ?? new Date("2026-01-01T00:00:00.000Z");
  const scanDirectory: ScanDirectory = {
    async lookup(scanId, at, locale) {
      lookups.push(scanId);
      const lookup = options.lookup ?? { status: "verified", snapshot: snapshot() };
      return typeof lookup === "function" ? lookup(scanId, at, locale) : lookup;
    },
  };
  const deps: InquiryDeps = {
    store,
    notifier: {
      async send(record) {
        sends.push(record);
        if (options.notify) return options.notify(sends.length);
        return { status: "sent" };
      },
    },
    scanDirectory,
    now: () => now,
    retentionDays: options.retentionDays ?? 90,
    rateLimitPerHour: options.rateLimitPerHour ?? 10,
    logger: {
      info(event) { logs.push(event); },
      error(event) { logs.push(event); },
    },
  };
  const httpDeps: HttpDeps = {
    ...deps,
    allowedOrigins: ["https://www.nlstudio.io", "https://nlstudio.io", "http://localhost:3000"],
    retryTokens: ["retry-token"],
  };
  return {
    store,
    sends,
    lookups,
    logs,
    deps,
    httpDeps,
    setNow(value: Date) { now = value; },
    get now() { return now; },
  };
}

function assertNoSensitiveLogs(logs: unknown[]) {
  const text = JSON.stringify(logs);
  assert.equal(text.includes(EMAIL), false);
  assert.equal(text.includes(NAME), false);
  assert.equal(text.includes(PHONE), false);
  assert.equal(text.includes(GOAL), false);
}

test("copies the server snapshot and ignores client facts", async () => {
  const env = harness();
  const result = await createInquiry(payload(), env.deps);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.created, true);
  assert.match(result.inquiryId, /^inq_[a-f0-9]{32}$/);
  assert.equal(result.notification.delivered, true);
  assert.equal(result.notification.status, "sent");
  const record = await env.store?.getInquiry(result.inquiryId);
  assert.ok(record);
  assert.equal(record.snapshot.normalizedUrl, "https://example.com/");
  assert.equal(record.snapshot.finalUrl, "https://example.com/home");
  assert.equal(record.snapshot.checkedAt, "2025-12-31T12:00:00.000Z");
  assert.equal(record.snapshot.ruleVersion, "homepage-2026-10-29.1");
  assert.equal(record.snapshot.findings[0]?.evidence, "no meta description");
  assert.equal(record.snapshot.findings[0]?.signal, "missing");
  assert.equal(record.scanId, SCAN);
  assert.equal(record.email, EMAIL);
  assert.equal(record.phone, PHONE);
  assert.equal(record.deleteAt, "2026-04-01T00:00:00.000Z");
  assert.equal("marketingOptIn" in record, false);
  assert.equal(env.sends.length, 1);
  assertNoSensitiveLogs(env.logs);
});

test("phone is optional and names are not split", async () => {
  const env = harness();
  const result = await createInquiry(payload({ phone: "  ", requestId: "submission-id-0002" }), env.deps);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const record = await env.store?.getInquiry(result.inquiryId);
  assert.equal(record?.phone, null);
  assert.equal(record?.name, NAME);
});

test("rejects incomplete contact details without saving", async () => {
  const env = harness();
  for (const overrides of [{ name: " " }, { email: "not-an-email" }, { goal: "" }, { phone: "call me" }, { scanId: "../secret" }]) {
    const result = await createInquiry(payload(overrides), env.deps);
    assert.deepEqual(result, { ok: false, error: "validation" });
  }
  assert.equal(env.lookups.length, 0);
  assert.equal(env.sends.length, 0);
  assert.equal((await env.store?.listInquiries())?.length, 0);
});

test("rejects missing, expired, and invalid scan references", async () => {
  for (const lookup of [
    { status: "not_found" },
    { status: "invalid" },
  ] as ScanLookupResult[]) {
    const env = harness({ lookup });
    const result = await createInquiry(payload(), env.deps);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(env.sends.length, 0);
    assert.equal((await env.store?.listInquiries())?.length, 0);
  }
});

test("keeps the saved snapshot after the scan directory expires", async () => {
  let phase: ScanLookupResult = { status: "verified", snapshot: snapshot() };
  const env = harness({ lookup: () => phase });
  const saved = await createInquiry(payload(), env.deps);
  assert.equal(saved.ok, true);
  phase = { status: "not_found" };
  const again = await createInquiry(payload({ requestId: "inquiry-request-0002" }), env.deps);
  assert.deepEqual(again, { ok: false, error: "scan_not_found" });
  if (!saved.ok) return;
  const record = await env.store?.getInquiry(saved.inquiryId);
  assert.equal(record?.snapshot.checkedAt, "2025-12-31T12:00:00.000Z");
  assert.equal(record?.snapshot.ruleVersion, "homepage-2026-10-29.1");
});

test("retries of the same submission do not create or notify twice", async () => {
  const env = harness({ notify: () => ({ status: "failed", errorCode: "resend_500" }) });
  const first = await createInquiry(payload(), env.deps);
  const second = await createInquiry(payload({ email: "Ada@Example.com" }), env.deps);
  assert.equal(first.ok && second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.equal(second.created, false);
  assert.equal(first.inquiryId, second.inquiryId);
  assert.equal(second.notification.delivered, false);
  assert.equal(env.sends.length, 1);
  assert.equal((await env.store?.listInquiries())?.length, 1);
  const note = await env.store?.getNotification(first.inquiryId);
  assert.equal(note?.attempts, 1);
  assert.equal(note?.status, "pending");
});

test("a conflicting resubmit does not overwrite the saved request", async () => {
  const env = harness();
  const first = await createInquiry(payload(), env.deps);
  const second = await createInquiry(payload({ goal: "A different goal" }), env.deps);
  assert.equal(first.ok, true);
  assert.deepEqual(second, { ok: false, error: "conflict" });
  assert.equal(env.sends.length, 1);
  if (!first.ok) return;
  const record = await env.store?.getInquiry(first.inquiryId);
  assert.equal(record?.goal, GOAL);
});

test("parallel submits share one record and one notification", async () => {
  const env = harness();
  const [left, right] = await Promise.all([
    createInquiry(payload(), env.deps),
    createInquiry(payload(), env.deps),
  ]);
  assert.equal((await env.store?.listInquiries())?.length, 1);
  assert.equal(env.sends.length, 1);
  const ids = [left, right].flatMap((result) => result.ok ? [result.inquiryId] : []);
  assert.equal(new Set(ids).size, 1);
  const replay = await createInquiry(payload(), env.deps);
  assert.equal(replay.ok && replay.inquiryId, ids[0]);
  assert.equal(env.sends.length, 1);
});

test("save failure is not success and does not notify", async () => {
  const store = new MemoryInquiryStore();
  store.putInquiry = async () => {
    throw new Error(`disk full for ${EMAIL}`);
  };
  const env = harness({ store });
  const result = await createInquiry(payload(), env.deps);
  assert.deepEqual(result, { ok: false, error: "save_failed" });
  assert.equal(env.sends.length, 0);
  assert.equal(await store.getSubmission(REQUEST), null);
  assertNoSensitiveLogs(env.logs);
});

test("notification failure keeps the inquiry and can be retried later", async () => {
  let mode: "fail" | "send" = "fail";
  const env = harness({
    notify: () => mode === "fail" ? { status: "failed", errorCode: `mailbox ${EMAIL}` } : { status: "sent" },
  });
  const saved = await createInquiry(payload(), env.deps);
  assert.equal(saved.ok && saved.notification.delivered, false);
  if (!saved.ok) return;
  const pending = await env.store?.getNotification(saved.inquiryId);
  assert.equal(pending?.status, "pending");
  assert.equal(pending?.lastError, "notifier_failed");
  assert.ok(pending?.nextAttemptAt);

  const replay = await createInquiry(payload(), env.deps);
  assert.equal(replay.ok && replay.notification.delivered, false);
  assert.equal(env.sends.length, 1);

  mode = "send";
  env.setNow(new Date("2026-01-01T00:06:00.000Z"));
  const summary = await sweepDueNotifications(env.deps, 10);
  assert.equal(summary.sent, 1);
  assert.equal(env.sends.length, 2);
  assert.equal((await env.store?.getNotification(saved.inquiryId))?.status, "sent");

  env.setNow(new Date("2026-01-02T00:00:00.000Z"));
  await sweepDueNotifications(env.deps, 10);
  assert.equal(env.sends.length, 2);
  assertNoSensitiveLogs(env.logs);
});

test("not_configured notification is not reported as delivered", async () => {
  const env = harness({ notify: () => ({ status: "not_configured" }) });
  const saved = await createInquiry(payload(), env.deps);
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.notification.status, "not_configured");
  assert.equal(saved.notification.delivered, false);
  const note = await env.store?.getNotification(saved.inquiryId);
  assert.equal(note?.status, "not_configured");
  assert.notEqual(note?.status, "sent");
});

test("a thrown notifier still leaves a pending retry", async () => {
  const env = harness();
  env.deps.notifier = { async send() { throw new Error(`smtp ${EMAIL}`); } };
  const saved = await createInquiry(payload(), env.deps);
  assert.equal(saved.ok && saved.notification.status, "pending");
  if (!saved.ok) return;
  assert.equal((await env.store?.getNotification(saved.inquiryId))?.lastError, "notifier_threw");
  assertNoSensitiveLogs(env.logs);
});

test("preserves an unfinished submission claim without taking ownership", async () => {
  const env = harness();
  const body = payload();
  const fingerprint = fingerprintInquiry({
    scanId: SCAN,
    name: NAME,
    email: EMAIL,
    goal: GOAL,
    phone: PHONE,
  });
  const inquiryId = `inq_${"ab".repeat(16)}`;
  await env.store?.claimSubmission({ requestId: REQUEST, inquiryId, fingerprint });
  const saved = await createInquiry(body, env.deps);
  assert.deepEqual(saved, { ok: false, error: "save_failed" });
  assert.equal(env.sends.length, 0);
  assert.equal((await env.store?.listInquiries())?.length, 0);
  assert.deepEqual(await env.store?.getSubmission(REQUEST), { requestId: REQUEST, inquiryId, fingerprint });
});

for (const failFirstWrite of [false, true]) {
  test(`concurrent replay cannot take over a ${failFirstWrite ? "failing" : "successful"} active writer`, async () => {
    const store = new MemoryInquiryStore();
    const env = harness({ store });
    const entered = Promise.withResolvers<void>();
    const resume = Promise.withResolvers<void>();
    const putInquiry = store.putInquiry.bind(store);
    let firstWrite = true;
    store.putInquiry = async (record) => {
      if (firstWrite) {
        firstWrite = false;
        entered.resolve();
        await resume.promise;
        if (failFirstWrite) throw new Error("transient write failed");
      }
      await putInquiry(record);
    };
    const original = createInquiry(payload(), env.deps);
    await entered.promise;
    let replay;
    try {
      replay = await createInquiry(payload(), env.deps);
      assert.deepEqual(replay, { ok: false, error: "save_failed" });
      assert.equal(env.sends.length, 0);
      assert.equal((await store.listInquiries()).length, 0);
    } finally {
      resume.resolve();
      await original;
    }
    const result = await original;
    if (failFirstWrite) {
      assert.deepEqual(result, { ok: false, error: "save_failed" });
      assert.equal(await store.getSubmission(REQUEST), null);
      const retry = await createInquiry(payload(), env.deps);
      assert.equal(retry.ok, true);
      assert.equal((await store.listInquiries()).length, 1);
      assert.equal(env.sends.length, 1);
    } else {
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.ok(await store.getInquiry(result.inquiryId));
      assert.equal(env.sends.length, 1);
      const retry = await createInquiry(payload(), env.deps);
      assert.equal(retry.ok && retry.inquiryId, result.inquiryId);
      assert.equal(env.sends.length, 1);
    }
  });
}

for (const failNotificationWrite of [false, true]) {
  test(`concurrent replay waits for the initial notification write to ${failNotificationWrite ? "fail" : "commit"}`, async () => {
    const store = new MemoryInquiryStore();
    const env = harness({ store });
    const entered = Promise.withResolvers<void>();
    const resume = Promise.withResolvers<void>();
    const putNotification = store.putNotification.bind(store);
    let firstWrite = true;
    store.putNotification = async (notification) => {
      if (firstWrite) {
        firstWrite = false;
        entered.resolve();
        await resume.promise;
        if (failNotificationWrite) throw new Error("initial notification write failed");
      }
      await putNotification(notification);
    };
    const original = createInquiry(payload(), env.deps);
    await entered.promise;
    try {
      assert.equal((await store.listInquiries()).length, 1);
      assert.equal((await store.listNotifications()).length, 0);
      const replay = await createInquiry(payload(), env.deps);
      assert.deepEqual(replay, { ok: false, error: "save_failed" });
      assert.equal(env.sends.length, 0);
    } finally {
      resume.resolve();
      await original;
    }
    const result = await original;
    if (failNotificationWrite) {
      assert.deepEqual(result, { ok: false, error: "save_failed" });
      // A rejected remote marker write may have committed; preserve its
      // associated record and claim until their state can be reconciled.
      assert.equal((await store.listInquiries()).length, 1);
      assert.equal((await store.listNotifications()).length, 0);
      assert.ok(await store.getSubmission(REQUEST));
      assert.deepEqual(await createInquiry(payload(), env.deps), { ok: false, error: "save_failed" });
      assert.equal(env.sends.length, 0);
    } else {
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.ok(await store.getInquiry(result.inquiryId));
      const replay = await createInquiry(payload(), env.deps);
      assert.equal(replay.ok && replay.inquiryId, result.inquiryId);
      assert.equal(env.sends.length, 1);
    }
  });
}

test("a published notification whose write rejects cannot roll back an acknowledged replay", async () => {
  const store = new MemoryInquiryStore();
  const env = harness({ store });
  const entered = Promise.withResolvers<void>();
  const rejectWrite = Promise.withResolvers<void>();
  const putNotification = store.putNotification.bind(store);
  let firstWrite = true;
  store.putNotification = async (notification) => {
    await putNotification(notification);
    if (firstWrite) {
      firstWrite = false;
      entered.resolve();
      await rejectWrite.promise;
      throw new Error("Blob committed but response was lost");
    }
  };
  const original = createInquiry(payload(), env.deps);
  await entered.promise;
  const replay = await createInquiry(payload(), env.deps);
  try {
    assert.equal(replay.ok, true);
  } finally {
    rejectWrite.resolve();
    await original;
  }
  assert.deepEqual(await original, { ok: false, error: "save_failed" });
  if (!replay.ok) return;
  assert.ok(await store.getInquiry(replay.inquiryId));
  assert.ok(await store.getNotification(replay.inquiryId));
  assert.equal((await store.getSubmission(REQUEST))?.inquiryId, replay.inquiryId);
  const recovered = await createInquiry(payload(), env.deps);
  assert.equal(recovered.ok && recovered.inquiryId, replay.inquiryId);
  assert.deepEqual(await sweepDueNotifications(env.deps), { due: 1, sent: 1, pending: 0, notConfigured: 0 });
  assert.equal(env.sends.length, 1);
});

for (const state of ["sent", "backoff", "expired", "newer_due"] as const) {
  test(`a delayed notification lease rereads ${state} state before sending`, async () => {
    const store = new MemoryInquiryStore();
    let deliver = false;
    const env = harness({ store, notify: () => deliver ? { status: "sent" } : { status: "failed", errorCode: "resend_503" } });
    const saved = await createInquiry(payload(), env.deps);
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    env.setNow(new Date("2026-01-01T00:06:00.000Z"));
    const entered = Promise.withResolvers<void>();
    const resume = Promise.withResolvers<void>();
    const tryLease = store.tryLease.bind(store);
    let firstLease = true;
    store.tryLease = async (...args) => {
      if (firstLease) {
        firstLease = false;
        entered.resolve();
        await resume.promise;
      }
      return tryLease(...args);
    };
    const delayed = sweepDueNotifications(env.deps);
    await entered.promise;
    try {
      if (state === "expired") {
        env.setNow(new Date("2026-04-01T00:00:00.000Z"));
      } else {
        deliver = state === "sent";
        await sweepDueNotifications(env.deps);
        if (state === "newer_due") env.setNow(new Date("2026-01-01T00:30:00.000Z"));
      }
    } finally {
      resume.resolve();
      await delayed;
    }
    assert.equal(env.sends.length, state === "expired" ? 1 : state === "newer_due" ? 3 : 2);
    assert.equal((await store.getNotification(saved.inquiryId))?.attempts, state === "expired" ? 1 : state === "newer_due" ? 3 : 2);
  });
}

test("purges contact records after the retention window", async () => {
  const env = harness({ retentionDays: 90 });
  const saved = await createInquiry(payload(), env.deps);
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  env.setNow(new Date("2026-04-01T00:00:00.000Z"));
  const next = await createInquiry(payload({ requestId: "submission-id-0090" }), env.deps);
  assert.equal(next.ok, true);
  assert.equal(await env.store?.getInquiry(saved.inquiryId), null);
  assert.equal(await env.store?.getNotification(saved.inquiryId), null);
  assert.equal(await env.store?.getSubmission(REQUEST), null);
});

test("deletes a matching request and does not reveal other people", async () => {
  const env = harness();
  const saved = await createInquiry(payload(), env.deps);
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  const wrong = await deleteInquiry({ inquiryId: saved.inquiryId, email: "other@example.com" }, env.deps);
  assert.deepEqual(wrong, { ok: false, error: "not_found" });
  assert.ok(await env.store?.getInquiry(saved.inquiryId));
  const removed = await deleteInquiry({ inquiryId: saved.inquiryId, email: "Ada@Example.com" }, env.deps);
  assert.deepEqual(removed, { ok: true });
  assert.equal(await env.store?.getInquiry(saved.inquiryId), null);
  assert.equal(await env.store?.getNotification(saved.inquiryId), null);
  assert.equal(await env.store?.getSubmission(REQUEST), null);
  assertNoSensitiveLogs(env.logs);
});

test("does not save when persistence is not configured", async () => {
  const env = harness({ store: null });
  const result = await createInquiry(payload(), env.deps);
  assert.deepEqual(result, { ok: false, error: "persistence_unconfigured" });
  assert.equal(env.lookups.length, 0);
  assert.equal(env.sends.length, 0);
});

test("rate limits new submissions but still replays the saved one", async () => {
  const env = harness({ rateLimitPerHour: 1 });
  const first = await createInquiry(payload(), env.deps, "203.0.113.8");
  const second = await createInquiry(payload({ requestId: "submission-id-0002" }), env.deps, "203.0.113.8");
  const replay = await createInquiry(payload(), env.deps, "203.0.113.8");
  assert.equal(first.ok, true);
  assert.deepEqual(second, { ok: false, error: "rate_limited" });
  assert.equal(replay.ok && first.ok && replay.inquiryId, first.ok ? first.inquiryId : "");
  assert.equal(env.sends.length, 1);
});

test("blob-backed claims are idempotent and private records round-trip", async () => {
  const client = new MapBlobClient();
  const store = createBlobInquiryStore(client);
  const env = harness();
  env.deps.store = store;
  const saved = await createInquiry(payload(), env.deps);
  assert.equal(saved.ok, true);
  const again = await createInquiry(payload(), env.deps);
  assert.equal(again.ok && saved.ok && again.inquiryId, saved.ok ? saved.inquiryId : "");
  assert.equal(env.sends.length, 1);
  assert.equal([...client.objects.keys()].some((key) => key.includes(EMAIL)), false);
  if (!saved.ok) return;
  const record = await store.getInquiry(saved.inquiryId);
  assert.equal(record?.snapshot.ruleVersion, "homepage-2026-10-29.1");
  await store.deleteInquiry(saved.inquiryId);
  assert.equal(await store.getInquiry(saved.inquiryId), null);
});

test("http saves only after persistence and never lists leads", async () => {
  const env = harness();
  const request = (url: string, body: unknown, headers: Record<string, string> = {}) => new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      origin: "https://www.nlstudio.io",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const created = await handleInquiryHttp(request("https://www.nlstudio.io/api/seo-inquiries", payload()), env.httpDeps);
  assert.equal(created.status, 201);
  const createdBody = await created.json();
  assert.equal(createdBody.received, true);
  assert.equal(JSON.stringify(createdBody).includes(EMAIL), false);
  assert.equal(createdBody.notificationStatus, "sent");

  const replay = await handleInquiryHttp(request("https://www.nlstudio.io/api/seo-inquiries", payload()), env.httpDeps);
  assert.equal(replay.status, 200);
  const replayBody = await replay.json();
  assert.equal(replayBody.inquiryId, createdBody.inquiryId);
  assert.equal(env.sends.length, 1);

  const listed = await handleInquiryHttp(new Request(`https://www.nlstudio.io/api/seo-inquiries?scan=${SCAN}`), env.httpDeps);
  assert.equal(listed.status, 405);
  const listedText = await listed.text();
  assert.equal(listedText.includes(EMAIL), false);
  assert.equal(listedText.includes(GOAL), false);

  const byId = await handleInquiryHttp(new Request(`https://www.nlstudio.io/api/seo-inquiries/${createdBody.inquiryId}`), env.httpDeps);
  assert.equal(byId.status, 405);
  assert.equal((await byId.text()).includes(EMAIL), false);
});

test("http distinguishes save failure, scan failure, and a disallowed origin", async () => {
  const env = harness({ lookup: { status: "not_found" } });
  const expired = await handleInquiryHttp(new Request("https://www.nlstudio.io/api/seo-inquiries", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", origin: "https://www.nlstudio.io" },
    body: JSON.stringify(payload()),
  }), env.httpDeps);
  assert.equal(expired.status, 422);
  assert.deepEqual(await expired.json(), { received: false, error: "scan_not_found" });

  const blocked = await handleInquiryHttp(new Request("https://www.nlstudio.io/api/seo-inquiries", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", origin: "https://evil.example" },
    body: JSON.stringify(payload()),
  }), env.httpDeps);
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.get("access-control-allow-origin"), null);

  const missingStore = harness({ store: null });
  const not_configured = await handleInquiryHttp(new Request("https://www.nlstudio.io/api/seo-inquiries", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify(payload()),
  }), missingStore.httpDeps);
  assert.equal(not_configured.status, 503);
  assert.deepEqual(await not_configured.json(), { received: false, error: "persistence_unconfigured" });
});

test("html responses keep typed values on failure and do not fake delivery", async () => {
  const env = harness({ notify: () => ({ status: "not_configured" }) });
  const failed = await handleInquiryHttp(new Request("https://www.nlstudio.io/api/seo-inquiries", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://www.nlstudio.io" },
    body: new URLSearchParams({
      scanId: SCAN,
      requestId: REQUEST,
      name: `<script>alert(1)</script>`,
      email: "not-an-email",
      goal: GOAL,
      phone: PHONE,
    }).toString(),
  }), env.httpDeps);
  assert.equal(failed.status, 400);
  const failedHtml = await failed.text();
  assert.match(failedHtml, /was not submitted/i);
  assert.match(failedHtml, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(failedHtml, /<script>alert\(1\)<\/script>/);
  assert.match(failedHtml, /Fix the homepage title/);
  assert.equal(env.sends.length, 0);

  const saved = await handleInquiryHttp(new Request("https://www.nlstudio.io/api/seo-inquiries", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://www.nlstudio.io" },
    body: new URLSearchParams({
      scanId: SCAN,
      requestId: REQUEST,
      name: NAME,
      email: EMAIL,
      goal: GOAL,
      phone: "",
      locale: "en",
    }).toString(),
  }), env.httpDeps);
  assert.equal(saved.status, 201);
  const savedHtml = await saved.text();
  assert.match(savedHtml, /We have received your request/);
  assert.match(savedHtml, /A notification email was not sent/);
  assert.match(savedHtml, /northlinestudio425@gmail\.com/);
  assert.doesNotMatch(savedHtml, /notification email was sent successfully/i);

  const deliveredNotifier = { async send() { return { status: "sent" as const }; } };
  env.deps.notifier = deliveredNotifier;
  env.httpDeps.notifier = deliveredNotifier;
  env.setNow(new Date("2026-01-01T02:00:00.000Z"));
  const delivered = await handleInquiryHttp(new Request("https://www.nlstudio.io/api/seo-inquiry-retries", {
    method: "POST",
    headers: { authorization: "Bearer retry-token", origin: "https://www.nlstudio.io" },
  }), env.httpDeps);
  assert.equal(delivered.status, 200);
  const summary = await delivered.json();
  assert.equal(summary.sent, 1);
  assert.equal(summary.inquiryId, undefined);

  const quiet = await handleInquiryHttp(new Request("https://www.nlstudio.io/api/seo-inquiry-retries", {
    method: "POST",
    headers: { authorization: "Bearer wrong-token" },
  }), env.httpDeps);
  assert.equal(quiet.status, 401);
});

test("deletion over http removes the lead only when the email matches", async () => {
  const env = harness();
  const created = await handleInquiryHttp(new Request("https://www.nlstudio.io/api/seo-inquiries", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", origin: "https://www.nlstudio.io" },
    body: JSON.stringify(payload()),
  }), env.httpDeps);
  const { inquiryId } = await created.json();
  const mismatch = await handleInquiryHttp(new Request("https://www.nlstudio.io/api/seo-inquiry-deletions", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", origin: "https://www.nlstudio.io" },
    body: JSON.stringify({ inquiryId, email: "other@example.com" }),
  }), env.httpDeps);
  assert.equal(mismatch.status, 404);
  assert.equal((await mismatch.text()).includes(EMAIL), false);
  assert.ok(await env.store?.getInquiry(inquiryId));

  const removed = await handleInquiryHttp(new Request("https://www.nlstudio.io/api/seo-inquiry-deletions", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", origin: "https://www.nlstudio.io" },
    body: JSON.stringify({ inquiryId, email: EMAIL }),
  }), env.httpDeps);
  assert.equal(removed.status, 200);
  assert.equal(await env.store?.getInquiry(inquiryId), null);
});

test("resend delivery follows the provider response and stays quiet without a key", async () => {
  const calls: Array<{ url: string; body: string; headers: Headers }> = [];
  const notifier = createResendNotifier({
    apiKey: "re_test",
    from: "Northline Studio <onboarding@resend.dev>",
    to: "northlinestudio425@gmail.com",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), body: String(init?.body ?? ""), headers: new Headers(init?.headers) });
      return new Response("secret body with " + EMAIL, { status: 202 });
    },
  });
  const record = {
    inquiryId: `inq_${"cd".repeat(16)}`,
    requestId: REQUEST,
    fingerprint: "abc",
    scanId: SCAN,
    snapshot: snapshot(),
    name: NAME,
    email: EMAIL,
    goal: GOAL,
    phone: PHONE,
    createdAt: "2026-01-01T00:00:00.000Z",
    deleteAt: "2026-04-01T00:00:00.000Z",
  };
  assert.deepEqual(await notifier.send(record), { status: "sent" });
  assert.match(calls[0].body, /2026-10-29\.1/);
  assert.doesNotMatch(calls[0].body, /evil\.example/);
  await notifier.send(record);
  await notifier.send({ ...record, inquiryId: `inq_${"ef".repeat(16)}` });
  assert.equal(calls[0].headers.get("Idempotency-Key"), "inquiry:inq_cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd");
  assert.equal(calls[1].headers.get("Idempotency-Key"), "inquiry:inq_cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd");
  assert.equal(calls[2].headers.get("Idempotency-Key"), "inquiry:inq_efefefefefefefefefefefefefefefef");

  const failing = createResendNotifier({
    apiKey: "re_test",
    from: "Northline Studio <onboarding@resend.dev>",
    to: "northlinestudio425@gmail.com",
    fetchImpl: async () => new Response("nope", { status: 401 }),
  });
  assert.deepEqual(await failing.send(record), { status: "failed", errorCode: "resend_401" });

  const offline = createResendNotifier({
    apiKey: "re_test",
    from: "Northline Studio <onboarding@resend.dev>",
    to: "northlinestudio425@gmail.com",
    fetchImpl: async () => { throw new Error("network"); },
  });
  assert.deepEqual(await offline.send(record), { status: "failed", errorCode: "resend_network" });

  assert.deepEqual(await createUnconfiguredNotifier().send(record), { status: "not_configured" });
  assert.deepEqual(await createNotifierFromEnv({}).send(record), { status: "not_configured" });
});

test("readStoredScan keeps a cached check and drops it after retention", async () => {
  const time = clock(Date.parse("2026-01-01T00:00:00.000Z"));
  const store = createMemoryStore();
  const transport = scriptedConnector(() => htmlResult(pageHtml()));
  const deps = {
    store,
    resolver: publicResolver().resolver,
    connector: transport.connector,
    now: time.now,
  };
  const checked = await runSeoCheck(
    { url: "https://example.com/", locale: "en", requestId: requestId(1), clientIp: "203.0.113.50" },
    deps,
  );
  const scanId = checked.body.scanId ?? "";
  assert.match(scanId, /^scan_/);
  time.advance(24 * 60 * 60 * 1000 + 1);
  const stillThere = await readStoredScan(scanId, "en", { store, now: time.now });
  assert.equal(stillThere?.checkedAt, checked.body.checkedAt);
  assert.equal(stillThere?.normalizedUrl, "https://example.com/");
  assert.notEqual(stillThere?.findings, checked.body.findings && "client");

  const savedEnv = harness({ now: new Date(time.now()) });
  const inquiry = await createInquiry({
    scanId,
    requestId: "inquiry-request-live1",
    name: NAME,
    email: EMAIL,
    goal: "Use the stored homepage, not this sentence as evidence",
    locale: "en",
    findings: [{ evidence: "tampered by the browser" }],
    normalizedUrl: "https://evil.example/override",
  }, {
    ...savedEnv.deps,
    scanDirectory: createScanDirectory({ store, now: time.now }),
    now: () => new Date(time.now()),
  });
  assert.equal(inquiry.ok, true);
  if (!inquiry.ok) return;
  const savedRecord = await savedEnv.store?.getInquiry(inquiry.inquiryId);
  assert.equal(savedRecord?.snapshot.normalizedUrl, "https://example.com/");
  assert.equal(savedRecord?.snapshot.checkedAt, checked.body.checkedAt);
  assert.equal(JSON.stringify(savedRecord?.snapshot).includes("tampered by the browser"), false);
  assert.equal(JSON.stringify(savedRecord?.snapshot).includes("evil.example"), false);

  time.advance(7 * 24 * 60 * 60 * 1000);
  const expired = await createInquiry({
    scanId,
    requestId: "inquiry-request-live2",
    name: NAME,
    email: EMAIL,
    goal: GOAL,
    locale: "en",
  }, {
    ...harness().deps,
    scanDirectory: createScanDirectory({ store, now: time.now }),
    now: () => new Date(time.now()),
  });
  assert.deepEqual(expired, { ok: false, error: "scan_not_found" });

  const invalid = await createInquiry({
    scanId: "../secret",
    requestId: "inquiry-request-live3",
    name: NAME,
    email: EMAIL,
    goal: GOAL,
  }, harness().deps);
  assert.deepEqual(invalid, { ok: false, error: "validation" });
});

test("inquiry link carries only the scan reference and locale", () => {
  assert.equal(seoInquiryHref(SCAN), `/seo?scan=${SCAN}#seo-inquiry`);
  assert.equal(seoInquiryHref(SCAN, "zh"), `/seo?scan=${SCAN}&locale=zh#seo-inquiry`);
});

test("production settings fail closed without blob or retry credentials", () => {
  assert.equal(blobCredentialsConfigured({}), false);
  assert.equal(blobCredentialsConfigured({ BLOB_READ_WRITE_TOKEN: "  " }), false);
  assert.equal(blobCredentialsConfigured({ BLOB_STORE_ID: "store_1", VERCEL_OIDC_TOKEN: "token" }), true);
  const settings = inquirySettings({ SEO_INQUIRY_RETENTION_DAYS: "0", SEO_INQUIRY_ALLOWED_ORIGINS: "https://preview.example" });
  assert.equal(settings.retentionDays, 90);
  assert.equal(settings.retryTokens.length, 0);
  assert.ok(settings.allowedOrigins.includes("https://www.nlstudio.io"));
  assert.ok(settings.allowedOrigins.includes("https://preview.example"));
});

test("authenticated cron GET retries due notifications without opening other GET operations", async () => {
  let sent = false;
  const env = harness({ notify: () => sent ? { status: "sent" } : { status: "failed", errorCode: "resend_503" } });
  const saved = await createInquiry(payload(), env.deps);
  assert.equal(saved.ok, true);
  env.setNow(new Date("2026-01-01T00:06:00.000Z"));
  sent = true;
  const retryRequest = (token?: string) => new Request("https://www.nlstudio.io/api/seo-inquiry-retries", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  for (const token of [undefined, "wrong-token"]) {
    const denied = await handleInquiryHttp(retryRequest(token), env.httpDeps);
    assert.equal(denied.status, 401);
  }
  assert.equal(env.sends.length, 1);
  const cron = await handleInquiryHttp(retryRequest("retry-token"), env.httpDeps);
  assert.equal(cron.status, 200);
  assert.deepEqual(await cron.json(), { ok: true, due: 1, sent: 1, pending: 0, notConfigured: 0 });
  assert.equal(env.sends.length, 2);
  for (const path of ["seo-inquiries", "seo-inquiry-deletions"]) {
    const response = await handleInquiryHttp(new Request(`https://www.nlstudio.io/api/${path}`, {
      headers: { authorization: "Bearer retry-token" },
    }), env.httpDeps);
    assert.equal(response.status, 405);
  }
});

test("OPTIONS returns an empty 204 response with allowed-origin CORS headers", async () => {
  const env = harness();
  for (const path of ["seo-inquiries", "seo-inquiry-deletions", "seo-inquiry-retries"]) {
    const response = await handleInquiryHttp(new Request(`https://www.nlstudio.io/api/${path}`, {
      method: "OPTIONS",
      headers: { origin: "https://www.nlstudio.io" },
    }), env.httpDeps);
    assert.equal(response.status, 204);
    assert.equal(await response.text(), "");
    assert.equal(response.headers.get("access-control-allow-origin"), "https://www.nlstudio.io");
    assert.match(response.headers.get("access-control-allow-methods") ?? "", /POST/);
  }
});
