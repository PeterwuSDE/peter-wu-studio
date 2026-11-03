import assert from "node:assert/strict";
import test from "node:test";
import { seoInquiryHref } from "../lib/seo/inquiry-href.ts";
import { createBlobInquiryStore, MapBlobClient } from "../lib/seo/blob-inquiry-store.ts";
import type { ScanDirectory, ScanLookupResult, SeoScanSnapshot } from "../lib/seo/contract.ts";
import { copyScanSnapshot } from "../lib/seo/contract.ts";
import { handleInquiryHttp, type HttpDeps } from "../lib/seo/http.ts";
import { MemoryInquiryStore } from "../lib/seo/inquiry-store.ts";
import { createInquiry, deleteInquiry, fingerprintInquiry, sweepDueNotifications, type InquiryDeps } from "../lib/seo/inquiry-service.ts";
import { createNotifierFromEnv, createResendNotifier, createUnconfiguredNotifier } from "../lib/seo/notifier.ts";
import { blobCredentialsConfigured, inquirySettings } from "../lib/seo/production.ts";

const SCAN = "scan_home_01";
const SUBMISSION = "submission-id-0001";
const EMAIL = "ada@example.com";
const NAME = "Ada North";
const GOAL = "Fix the homepage title";
const PHONE = "555-0100";

function snapshot(overrides: Partial<SeoScanSnapshot> = {}): SeoScanSnapshot {
  return {
    reference: SCAN,
    canonicalUrl: "https://example.com/",
    finalUrl: "https://example.com/home",
    checkedAt: "2025-12-31T12:00:00.000Z",
    ruleVersion: "2026-10-29.1",
    locale: "en",
    status: "completed",
    cacheHit: false,
    cacheExpiresAt: "2026-01-01T12:00:00.000Z",
    coverage: { completed: 6, unknown: 1, notApplicable: 1 },
    checks: [{
      ruleId: "title",
      ruleVersion: "2026-10-29.1",
      state: "pass",
      url: "https://example.com/",
      observed: "Example",
    }],
    findings: [{
      ruleId: "description",
      ruleVersion: "2026-10-29.1",
      url: "https://example.com/",
      observed: "missing",
      evidence: "<meta name=\"description\">",
      checkedAt: "2025-12-31T12:00:00.000Z",
      reason: "A search engine may write its own snippet.",
      suggestion: "Add a short description.",
    }],
    ...overrides,
  };
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    scanReference: SCAN,
    submissionId: SUBMISSION,
    name: NAME,
    email: EMAIL,
    goal: GOAL,
    phone: PHONE,
    marketingOptIn: true,
    canonicalUrl: "https://evil.example/override",
    ruleVersion: "client-tampered",
    findings: [{ observed: "tampered" }],
    ...overrides,
  };
}

function harness(options: {
  lookup?: ScanLookupResult | ((reference: string, now: Date) => ScanLookupResult | Promise<ScanLookupResult>);
  notify?: (calls: number) => { status: "sent" } | { status: "unconfigured" } | { status: "failed"; errorCode: string };
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
    async lookup(reference, at) {
      lookups.push(reference);
      const lookup = options.lookup ?? { status: "verified", snapshot: snapshot() };
      return typeof lookup === "function" ? lookup(reference, at) : lookup;
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
  assert.equal(record.snapshot.canonicalUrl, "https://example.com/");
  assert.equal(record.snapshot.finalUrl, "https://example.com/home");
  assert.equal(record.snapshot.checkedAt, "2025-12-31T12:00:00.000Z");
  assert.equal(record.snapshot.ruleVersion, "2026-10-29.1");
  assert.equal(record.snapshot.findings[0]?.observed, "missing");
  assert.equal(record.email, EMAIL);
  assert.equal(record.phone, PHONE);
  assert.equal(record.deleteAt, "2026-04-01T00:00:00.000Z");
  assert.equal("marketingOptIn" in record, false);
  assert.equal(env.sends.length, 1);
  assertNoSensitiveLogs(env.logs);
});

test("phone is optional and names are not split", async () => {
  const env = harness();
  const result = await createInquiry(payload({ phone: "  ", submissionId: "submission-id-0002" }), env.deps);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const record = await env.store?.getInquiry(result.inquiryId);
  assert.equal(record?.phone, null);
  assert.equal(record?.name, NAME);
});

test("rejects incomplete contact details without saving", async () => {
  const env = harness();
  for (const overrides of [{ name: " " }, { email: "not-an-email" }, { goal: "" }, { phone: "call me" }, { scanReference: "../secret" }]) {
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
    { status: "expired" },
    { status: "invalid" },
    { status: "verified", snapshot: snapshot({ findings: [{ ...snapshot().findings[0], ruleId: "bad id" }] }) },
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
  phase = { status: "expired" };
  const again = await createInquiry(payload({ submissionId: "submission-id-0002" }), env.deps);
  assert.deepEqual(again, { ok: false, error: "scan_expired" });
  if (!saved.ok) return;
  const record = await env.store?.getInquiry(saved.inquiryId);
  assert.equal(record?.snapshot.checkedAt, "2025-12-31T12:00:00.000Z");
  assert.equal(record?.snapshot.ruleVersion, "2026-10-29.1");
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
  assert.equal(await store.getSubmission(SUBMISSION), null);
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

test("unconfigured notification is not reported as delivered", async () => {
  const env = harness({ notify: () => ({ status: "unconfigured" }) });
  const saved = await createInquiry(payload(), env.deps);
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.notification.status, "unconfigured");
  assert.equal(saved.notification.delivered, false);
  const note = await env.store?.getNotification(saved.inquiryId);
  assert.equal(note?.status, "unconfigured");
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

test("recovers a claimed submission that never finished saving", async () => {
  const env = harness();
  const body = payload();
  const fingerprint = fingerprintInquiry({
    scanReference: SCAN,
    name: NAME,
    email: EMAIL,
    goal: GOAL,
    phone: PHONE,
  });
  const inquiryId = `inq_${"ab".repeat(16)}`;
  await env.store?.claimSubmission({ submissionId: SUBMISSION, inquiryId, fingerprint });
  const saved = await createInquiry(body, env.deps);
  assert.equal(saved.ok && saved.inquiryId, inquiryId);
  assert.equal(env.sends.length, 1);
  assert.equal((await env.store?.listInquiries())?.length, 1);
});

test("purges contact records after the retention window", async () => {
  const env = harness({ retentionDays: 90 });
  const saved = await createInquiry(payload(), env.deps);
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  env.setNow(new Date("2026-04-01T00:00:00.000Z"));
  const next = await createInquiry(payload({ submissionId: "submission-id-0090" }), env.deps);
  assert.equal(next.ok, true);
  assert.equal(await env.store?.getInquiry(saved.inquiryId), null);
  assert.equal(await env.store?.getNotification(saved.inquiryId), null);
  assert.equal(await env.store?.getSubmission(SUBMISSION), null);
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
  assert.equal(await env.store?.getSubmission(SUBMISSION), null);
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
  const second = await createInquiry(payload({ submissionId: "submission-id-0002" }), env.deps, "203.0.113.8");
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
  assert.equal(record?.snapshot.ruleVersion, "2026-10-29.1");
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
  assert.equal(createdBody.notification.delivered, true);

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
  const env = harness({ lookup: { status: "expired" } });
  const expired = await handleInquiryHttp(new Request("https://www.nlstudio.io/api/seo-inquiries", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", origin: "https://www.nlstudio.io" },
    body: JSON.stringify(payload()),
  }), env.httpDeps);
  assert.equal(expired.status, 422);
  assert.deepEqual(await expired.json(), { received: false, error: "scan_expired" });

  const blocked = await handleInquiryHttp(new Request("https://www.nlstudio.io/api/seo-inquiries", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", origin: "https://evil.example" },
    body: JSON.stringify(payload()),
  }), env.httpDeps);
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.get("access-control-allow-origin"), null);

  const missingStore = harness({ store: null });
  const unconfigured = await handleInquiryHttp(new Request("https://www.nlstudio.io/api/seo-inquiries", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify(payload()),
  }), missingStore.httpDeps);
  assert.equal(unconfigured.status, 503);
  assert.deepEqual(await unconfigured.json(), { received: false, error: "persistence_unconfigured" });
});

test("html responses keep typed values on failure and do not fake delivery", async () => {
  const env = harness({ notify: () => ({ status: "unconfigured" }) });
  const failed = await handleInquiryHttp(new Request("https://www.nlstudio.io/api/seo-inquiries", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://www.nlstudio.io" },
    body: new URLSearchParams({
      scanReference: SCAN,
      submissionId: SUBMISSION,
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
      scanReference: SCAN,
      submissionId: SUBMISSION,
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
  const calls: Array<{ url: string; body: string }> = [];
  const notifier = createResendNotifier({
    apiKey: "re_test",
    from: "Northline Studio <onboarding@resend.dev>",
    to: "northlinestudio425@gmail.com",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), body: String(init?.body ?? "") });
      return new Response("secret body with " + EMAIL, { status: 202 });
    },
  });
  const record = {
    inquiryId: `inq_${"cd".repeat(16)}`,
    submissionId: SUBMISSION,
    fingerprint: "abc",
    scanReference: SCAN,
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

  assert.deepEqual(await createUnconfiguredNotifier().send(record), { status: "unconfigured" });
  assert.deepEqual(await createNotifierFromEnv({}).send(record), { status: "unconfigured" });
});

test("snapshot copy drops tampered or oversized finding lists", () => {
  assert.equal(copyScanSnapshot(SCAN, { ...snapshot(), reference: "other_scan_1" }), null);
  const tooMany = snapshot();
  tooMany.findings = [tooMany.findings[0], tooMany.findings[0], tooMany.findings[0]];
  assert.equal(copyScanSnapshot(SCAN, tooMany), null);
  const copied = copyScanSnapshot(SCAN, { ...snapshot(), secret: EMAIL });
  assert.equal(copied && "secret" in copied, false);
});

test("inquiry link carries only the scan reference and locale", () => {
  assert.equal(seoInquiryHref(SCAN), `/seo?scan=${SCAN}#inquiry`);
  assert.equal(seoInquiryHref(SCAN, "zh"), `/seo?scan=${SCAN}&locale=zh#inquiry`);
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
