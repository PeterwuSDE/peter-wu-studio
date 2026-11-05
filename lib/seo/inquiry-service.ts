import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { normalizeLocale, SEO_CHECK_REQUEST_ID_PATTERN, type SeoCheckLocale } from "../../shared/seo-check/contract.ts";
import { SCAN_ID_PATTERN, type ScanDirectory } from "./scan-directory.ts";
import type { InquiryNotification, InquiryRecord, InquiryStore } from "./inquiry-store.ts";
import { notificationDelivered, type InquiryNotifier } from "./notifier.ts";

export type CreateInquiryError =
  | "validation"
  | "scan_not_found"
  | "scan_invalid"
  | "scan_unavailable"
  | "conflict"
  | "rate_limited"
  | "persistence_unconfigured"
  | "save_failed";

export type InquiryServiceError = CreateInquiryError | "not_found";

export interface InquiryDeps {
  store: InquiryStore | null;
  notifier: InquiryNotifier;
  scanDirectory: ScanDirectory;
  now: () => Date;
  retentionDays: number;
  rateLimitPerHour: number;
  logger?: InquiryLogger;
}

export interface InquiryLogger {
  info(event: Record<string, unknown>): void;
  error(event: Record<string, unknown>): void;
}

export interface PublicNotification {
  status: InquiryNotification["status"];
  delivered: boolean;
}

export type CreateInquiryResult =
  | {
    ok: true;
    created: boolean;
    inquiryId: string;
    scanId: string;
    requestId: string;
    createdAt: string;
    notification: PublicNotification;
  }
  | { ok: false; error: CreateInquiryError };

export interface ParsedInquiry {
  scanId: string;
  requestId: string;
  locale: SeoCheckLocale;
  name: string;
  email: string;
  goal: string;
  phone: string | null;
  fingerprint: string;
}

const LEASE_MS = 2 * 60 * 1000;
const UNCONFIGURED_DELAY_MS = 60 * 60 * 1000;
const BACKOFF_MINUTES = [5, 15, 60, 360, 1440];

function logInfo(deps: InquiryDeps, event: Record<string, unknown>) {
  deps.logger?.info({ scope: "seo-inquiry", ...event });
}

function logError(deps: InquiryDeps, event: Record<string, unknown>) {
  deps.logger?.error({ scope: "seo-inquiry", ...event });
}

function singleLine(value: string, max: number): string | null {
  const cleaned = value.replace(/\u0000/g, "").trim();
  if (!cleaned || cleaned.length > max) return null;
  if (/[\u0000-\u001F]/.test(cleaned)) return null;
  return cleaned;
}

function multiLine(value: string, max: number): string | null {
  const cleaned = value.replace(/\u0000/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (!cleaned || cleaned.length > max) return null;
  return cleaned;
}

function normalizeEmail(value: string): string | null {
  const cleaned = singleLine(value, 254);
  if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return null;
  return cleaned.toLowerCase();
}

function normalizePhone(value: unknown): string | null | "invalid" {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const cleaned = singleLine(value, 40);
  if (!cleaned) return null;
  if (!/^[0-9+().\-\s]{3,40}$/.test(cleaned)) return "invalid";
  return cleaned;
}

export function fingerprintInquiry(input: Pick<ParsedInquiry, "scanId" | "name" | "email" | "goal" | "phone">): string {
  return createHash("sha256").update(JSON.stringify({
    scanId: input.scanId,
    name: input.name,
    email: input.email,
    goal: input.goal,
    phone: input.phone ?? "",
  })).digest("hex");
}

export function parseInquiryPayload(input: unknown): ParsedInquiry | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const body = input as Record<string, unknown>;
  const scanId = typeof body.scanId === "string" ? body.scanId : "";
  const requestId = typeof body.requestId === "string" ? body.requestId : "";
  if (!SCAN_ID_PATTERN.test(scanId) || !SEO_CHECK_REQUEST_ID_PATTERN.test(requestId)) return null;
  if (typeof body.name !== "string" || typeof body.email !== "string" || typeof body.goal !== "string") return null;
  const locale = normalizeLocale(body.locale);
  if (!locale) return null;
  const name = singleLine(body.name, 80);
  const email = normalizeEmail(body.email);
  const goal = multiLine(body.goal, 1000);
  const phone = normalizePhone(body.phone);
  if (!name || !email || !goal || phone === "invalid") return null;
  const parsed = { scanId, requestId, locale, name, email, goal, phone };
  return { ...parsed, fingerprint: fingerprintInquiry(parsed) };
}

function createInquiryId(): string {
  return `inq_${randomBytes(16).toString("hex")}`;
}

function emailsMatch(stored: string, provided: string): boolean {
  const left = Buffer.from(stored);
  const right = Buffer.from(provided);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function isInquiryId(value: string): boolean {
  return /^inq_[a-f0-9]{32}$/.test(value);
}

function publicNotification(record: InquiryNotification | null): PublicNotification {
  const status = record?.status ?? "pending";
  return { status, delivered: notificationDelivered(status) };
}

function backoffMs(attempts: number): number {
  const index = Math.min(Math.max(attempts, 1), BACKOFF_MINUTES.length) - 1;
  return BACKOFF_MINUTES[index] * 60 * 1000;
}

async function purgeRecord(deps: InquiryDeps, store: InquiryStore, record: InquiryRecord): Promise<void> {
  // Keep the record as a retry anchor until every associated object is gone.
  await store.deleteNotification(record.inquiryId);
  await store.releaseLease(record.inquiryId);
  await store.releaseSubmission(record.requestId);
  await store.deleteInquiry(record.inquiryId);
  logInfo(deps, { event: "purged", inquiryId: record.inquiryId });
}

async function purgeExpired(deps: InquiryDeps, store: InquiryStore, now: Date): Promise<void> {
  const maintenance = store.maintenance;
  const page = maintenance ? await maintenance.inquiryPage(25) : null;
  const records = page ? page.records : await store.listInquiries();
  for (const record of records) {
    if (Date.parse(record.deleteAt) > now.getTime()) continue;
    await purgeRecord(deps, store, record);
  }
  if (page && maintenance) await maintenance.commit("inquiries", page.nextCursor);
}

async function replayExisting(
  store: InquiryStore,
  claim: { inquiryId: string; fingerprint: string },
  fingerprint: string,
  now: Date,
): Promise<CreateInquiryResult> {
  if (claim.fingerprint !== fingerprint) return { ok: false, error: "conflict" };
  const record = await store.getInquiry(claim.inquiryId);
  if (!record || Date.parse(record.deleteAt) <= now.getTime()) return { ok: false, error: "save_failed" };
  const notification = await store.getNotification(record.inquiryId);
  // The initial notification is the publication marker. Until it exists, the
  // save is incomplete and cannot be acknowledged by another request.
  if (!notification) return { ok: false, error: "save_failed" };
  return {
    ok: true,
    created: false,
    inquiryId: record.inquiryId,
    scanId: record.scanId,
    requestId: record.requestId,
    createdAt: record.createdAt,
    notification: publicNotification(notification),
  };
}

async function attemptDelivery(deps: InquiryDeps, store: InquiryStore, record: InquiryRecord): Promise<InquiryNotification> {
  const now = deps.now();
  const current = await store.getNotification(record.inquiryId);
  const base: InquiryNotification = current ?? {
    inquiryId: record.inquiryId,
    status: "pending",
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
  };
  if (Date.parse(record.deleteAt) <= now.getTime()) return base;
  if (base.status === "sent") {
    // Reconcile a queue entry left behind by an uncertain sent-marker write.
    await store.putNotification(base);
    return base;
  }
  if (base.nextAttemptAt && Date.parse(base.nextAttemptAt) > now.getTime()) return base;

  const leased = await store.tryLease(record.inquiryId, now, LEASE_MS);
  if (!leased) return base;

  try {
    // A worker may have completed or rescheduled delivery while this request
    // waited for its lease. Revalidate the durable state under ownership.
    const [latest, latestRecord] = await Promise.all([
      store.getNotification(record.inquiryId),
      store.getInquiry(record.inquiryId),
    ]);
    const leasedNow = deps.now();
    if (!latest || !latestRecord || Date.parse(latestRecord.deleteAt) <= leasedNow.getTime()) return latest ?? base;
    if (latest.status === "sent") {
      await store.putNotification(latest);
      return latest;
    }
    if (latest.nextAttemptAt && Date.parse(latest.nextAttemptAt) > leasedNow.getTime()) return latest;
    let result;
    try {
      result = await deps.notifier.send(latestRecord);
    } catch {
      result = { status: "failed" as const, errorCode: "notifier_threw" };
    }
    const attempts = latest.attempts + 1;
    const errorCode = result.status === "failed" && /^[a-z0-9_-]{1,40}$/i.test(result.errorCode)
      ? result.errorCode
      : "notifier_failed";
    const next: InquiryNotification = result.status === "sent"
      ? { inquiryId: record.inquiryId, status: "sent", attempts, nextAttemptAt: null, lastError: null }
      : result.status === "not_configured"
        ? {
          inquiryId: record.inquiryId,
          status: "not_configured",
          attempts,
          nextAttemptAt: new Date(deps.now().getTime() + UNCONFIGURED_DELAY_MS).toISOString(),
          lastError: "not_configured",
        }
        : {
          inquiryId: record.inquiryId,
          status: "pending",
          attempts,
          nextAttemptAt: new Date(deps.now().getTime() + backoffMs(attempts)).toISOString(),
          lastError: errorCode,
        };
    await store.putNotification(next);
    logInfo(deps, {
      event: "notification",
      inquiryId: record.inquiryId,
      status: next.status,
      attempts: next.attempts,
      delivered: notificationDelivered(next.status),
    });
    return next;
  } finally {
    await store.releaseLease(record.inquiryId);
  }
}

function rateBucket(label: string, clientKey: string, now: Date): string {
  const hour = Math.floor(now.getTime() / 3_600_000);
  const hash = createHash("sha256").update(clientKey || "unknown").digest("hex").slice(0, 32);
  return `${label}:${hash}:${hour}`;
}

export async function createInquiry(raw: unknown, deps: InquiryDeps, clientKey = "unknown"): Promise<CreateInquiryResult> {
  const parsed = parseInquiryPayload(raw);
  if (!parsed) return { ok: false, error: "validation" };
  const store = deps.store;
  if (!store) return { ok: false, error: "persistence_unconfigured" };

  const now = deps.now();
  try {
    if (!store.maintenance) await purgeExpired(deps, store, now);
  } catch (error) {
    logError(deps, { event: "purge_failed", errorName: error instanceof Error ? error.name : "Error" });
  }

  const existing = await store.getSubmission(parsed.requestId);
  if (existing) {
    // A claim without a record may belong to an active writer. Without an
    // ownership token it cannot safely be recovered or cleaned up here.
    return replayExisting(store, existing, parsed.fingerprint, now);
  }

  const allowed = await store.consumeRate(rateBucket("create", clientKey, now), deps.rateLimitPerHour);
  if (!allowed) return { ok: false, error: "rate_limited" };

  let lookup;
  try {
    lookup = await deps.scanDirectory.lookup(parsed.scanId, now, parsed.locale);
  } catch (error) {
    logError(deps, { event: "scan_lookup_failed", errorName: error instanceof Error ? error.name : "Error" });
    return { ok: false, error: "scan_unavailable" };
  }
  if (lookup.status === "not_found") return { ok: false, error: "scan_not_found" };
  if (lookup.status === "invalid") return { ok: false, error: "scan_invalid" };

  const snapshot = lookup.snapshot;
  if (snapshot.scanId !== parsed.scanId) return { ok: false, error: "scan_invalid" };

  const inquiryId = createInquiryId();
  const claim = await store.claimSubmission({
    requestId: parsed.requestId,
    inquiryId,
    fingerprint: parsed.fingerprint,
  });
  if (claim === "exists") {
    const winner = await store.getSubmission(parsed.requestId);
    if (!winner) return { ok: false, error: "save_failed" };
    return replayExisting(store, winner, parsed.fingerprint, now);
  }

  const createdAt = now.toISOString();
  const record: InquiryRecord = {
    inquiryId,
    requestId: parsed.requestId,
    scanId: parsed.scanId,
    snapshot,
    name: parsed.name,
    email: parsed.email,
    goal: parsed.goal,
    phone: parsed.phone,
    createdAt,
    deleteAt: new Date(now.getTime() + deps.retentionDays * 24 * 60 * 60 * 1000).toISOString(),
  };

  let notificationWriteStarted = false;
  try {
    await store.putInquiry(record);
    notificationWriteStarted = true;
    await store.putNotification({
      inquiryId,
      status: "pending",
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
    });
  } catch (error) {
    // A remote marker write may have committed even when its response rejects.
    // Once publication is possible, preserve every object a replay can observe.
    if (!notificationWriteStarted) {
      await store.deleteInquiry(inquiryId).catch(() => undefined);
      await store.deleteNotification(inquiryId).catch(() => undefined);
      await store.releaseSubmission(parsed.requestId).catch(() => undefined);
    }
    logError(deps, { event: "save_failed", inquiryId, errorName: error instanceof Error ? error.name : "Error" });
    return { ok: false, error: "save_failed" };
  }

  logInfo(deps, { event: "saved", inquiryId, created: true });
  let notification: InquiryNotification;
  try {
    notification = await attemptDelivery(deps, store, record);
  } catch (error) {
    logError(deps, { event: "notification_record_failed", inquiryId, errorName: error instanceof Error ? error.name : "Error" });
    notification = {
      inquiryId,
      status: "pending",
      attempts: 0,
      nextAttemptAt: null,
      lastError: "notification_record_failed",
    };
  }

  if (!store.maintenance) {
    await sweepDueNotifications(deps, 5).catch((error: unknown) => {
      logError(deps, { event: "sweep_failed", errorName: error instanceof Error ? error.name : "Error" });
    });
  }

  return {
    ok: true,
    created: true,
    inquiryId,
    scanId: record.scanId,
    requestId: record.requestId,
    createdAt: record.createdAt,
    notification: publicNotification(notification),
  };
}

export async function deleteInquiry(
  raw: unknown,
  deps: InquiryDeps,
  clientKey = "unknown",
): Promise<{ ok: true } | { ok: false; error: InquiryServiceError }> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "validation" };
  const body = raw as Record<string, unknown>;
  if (typeof body.inquiryId !== "string" || !isInquiryId(body.inquiryId)) return { ok: false, error: "validation" };
  if (typeof body.email !== "string") return { ok: false, error: "validation" };
  const email = singleLine(body.email, 254)?.toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "validation" };
  const store = deps.store;
  if (!store) return { ok: false, error: "persistence_unconfigured" };

  const now = deps.now();
  const allowed = await store.consumeRate(rateBucket("delete", clientKey, now), deps.rateLimitPerHour);
  if (!allowed) return { ok: false, error: "rate_limited" };

  const record = await store.getInquiry(body.inquiryId);
  if (!record || !emailsMatch(record.email, email)) {
    logInfo(deps, { event: "delete_rejected", inquiryId: body.inquiryId });
    return { ok: false, error: "not_found" };
  }

  await store.deleteInquiry(record.inquiryId);
  await store.deleteNotification(record.inquiryId);
  await store.releaseSubmission(record.requestId);
  await store.releaseLease(record.inquiryId);
  logInfo(deps, { event: "deleted", inquiryId: record.inquiryId });
  return { ok: true };
}

export async function sweepDueNotifications(deps: InquiryDeps, limit = 10): Promise<{
  due: number;
  sent: number;
  pending: number;
  notConfigured: number;
}> {
  const store = deps.store;
  if (!store) return { due: 0, sent: 0, pending: 0, notConfigured: 0 };
  const now = deps.now();
  await purgeExpired(deps, store, now);
  const deliveryLimit = Math.max(0, Math.min(10, Math.floor(limit)));
  if (deliveryLimit === 0) return { due: 0, sent: 0, pending: 0, notConfigured: 0 };
  // One notification page is no larger than the delivery budget, so due items
  // never get skipped when committing the page's cursor.
  const maintenance = store.maintenance;
  const page = maintenance ? await maintenance.notificationPage(deliveryLimit) : null;
  const notifications = page ? page.records : await store.listNotifications();
  const dueNotes = notifications.filter((note) => note.status !== "sent"
    && (!note.nextAttemptAt || Date.parse(note.nextAttemptAt) <= now.getTime()));
  let sent = 0;
  let pending = 0;
  let notConfigured = 0;
  const processNotification = async (note: InquiryNotification) => {
    const record = await store.getInquiry(note.inquiryId);
    if (!record) {
      await store.deleteNotification(note.inquiryId);
      return;
    }
    if (Date.parse(record.deleteAt) <= now.getTime()) {
      await purgeRecord(deps, store, record);
      return;
    }
    const updated = await attemptDelivery(deps, store, record);
    if (updated.status === "sent") sent += 1;
    else if (updated.status === "not_configured") notConfigured += 1;
    else pending += 1;
  };
  const selected = dueNotes.slice(0, deliveryLimit);
  for (let offset = 0; offset < selected.length; offset += 5) {
    // Bound provider concurrency and wait for all writes before advancing or
    // reporting a failed page. A rejected write keeps the cursor unchanged.
    const outcomes = await Promise.allSettled(selected.slice(offset, offset + 5).map(processNotification));
    const failed = outcomes.find((outcome) => outcome.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
  }
  if (page && maintenance) await maintenance.commit("notifications", page.nextCursor);
  return { due: dueNotes.length, sent, pending, notConfigured };
}
