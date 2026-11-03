import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  copyScanSnapshot,
  isInquiryId,
  isScanReference,
  isSubmissionId,
  type InquiryRecord,
  type NotificationRecord,
  type ScanDirectory,
} from "./contract.ts";
import type { InquiryStore } from "./inquiry-store.ts";
import { notificationDelivered, type InquiryNotifier } from "./notifier.ts";

export type CreateInquiryError =
  | "validation"
  | "scan_not_found"
  | "scan_expired"
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
  status: NotificationRecord["status"];
  delivered: boolean;
}

export type CreateInquiryResult =
  | {
    ok: true;
    created: boolean;
    inquiryId: string;
    notification: PublicNotification;
  }
  | { ok: false; error: CreateInquiryError };

export interface ParsedInquiry {
  scanReference: string;
  submissionId: string;
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

export function fingerprintInquiry(input: Pick<ParsedInquiry, "scanReference" | "name" | "email" | "goal" | "phone">): string {
  return createHash("sha256").update(JSON.stringify({
    scanReference: input.scanReference,
    name: input.name,
    email: input.email,
    goal: input.goal,
    phone: input.phone ?? "",
  })).digest("hex");
}

export function parseInquiryPayload(input: unknown): ParsedInquiry | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const body = input as Record<string, unknown>;
  if (typeof body.scanReference !== "string" || !isScanReference(body.scanReference)) return null;
  if (typeof body.submissionId !== "string" || !isSubmissionId(body.submissionId)) return null;
  if (typeof body.name !== "string" || typeof body.email !== "string" || typeof body.goal !== "string") return null;
  const name = singleLine(body.name, 80);
  const email = normalizeEmail(body.email);
  const goal = multiLine(body.goal, 1000);
  const phone = normalizePhone(body.phone);
  if (!name || !email || !goal || phone === "invalid") return null;
  const parsed = {
    scanReference: body.scanReference,
    submissionId: body.submissionId,
    name,
    email,
    goal,
    phone,
  };
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

function publicNotification(record: NotificationRecord | null): PublicNotification {
  const status = record?.status ?? "pending";
  return { status, delivered: notificationDelivered(status) };
}

function backoffMs(attempts: number): number {
  const index = Math.min(Math.max(attempts, 1), BACKOFF_MINUTES.length) - 1;
  return BACKOFF_MINUTES[index] * 60 * 1000;
}

async function purgeExpired(deps: InquiryDeps, store: InquiryStore, now: Date): Promise<void> {
  const records = await store.listInquiries();
  for (const record of records) {
    if (Date.parse(record.deleteAt) > now.getTime()) continue;
    await store.deleteInquiry(record.inquiryId);
    await store.deleteNotification(record.inquiryId);
    await store.releaseSubmission(record.submissionId);
    await store.releaseLease(record.inquiryId);
    logInfo(deps, { event: "purged", inquiryId: record.inquiryId });
  }
}

async function replayExisting(
  store: InquiryStore,
  claim: { inquiryId: string; fingerprint: string },
  fingerprint: string,
): Promise<CreateInquiryResult> {
  if (claim.fingerprint !== fingerprint) return { ok: false, error: "conflict" };
  const record = await store.getInquiry(claim.inquiryId);
  if (!record) return { ok: false, error: "save_failed" };
  const notification = await store.getNotification(record.inquiryId);
  return { ok: true, created: false, inquiryId: record.inquiryId, notification: publicNotification(notification) };
}

async function attemptDelivery(deps: InquiryDeps, store: InquiryStore, record: InquiryRecord): Promise<NotificationRecord> {
  const now = deps.now();
  const current = await store.getNotification(record.inquiryId);
  const base: NotificationRecord = current ?? {
    inquiryId: record.inquiryId,
    status: "pending",
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    updatedAt: now.toISOString(),
  };
  if (base.status === "sent") return base;
  if (base.nextAttemptAt && Date.parse(base.nextAttemptAt) > now.getTime()) return base;

  const leased = await store.tryLease(record.inquiryId, now, LEASE_MS);
  if (!leased) return base;

  try {
    let result;
    try {
      result = await deps.notifier.send(record);
    } catch {
      result = { status: "failed" as const, errorCode: "notifier_threw" };
    }
    const attempts = base.attempts + 1;
    const updatedAt = deps.now().toISOString();
    const errorCode = result.status === "failed" && /^[a-z0-9_-]{1,40}$/i.test(result.errorCode)
      ? result.errorCode
      : "notifier_failed";
    const next: NotificationRecord = result.status === "sent"
      ? { inquiryId: record.inquiryId, status: "sent", attempts, nextAttemptAt: null, lastError: null, updatedAt }
      : result.status === "unconfigured"
        ? {
          inquiryId: record.inquiryId,
          status: "unconfigured",
          attempts,
          nextAttemptAt: new Date(deps.now().getTime() + UNCONFIGURED_DELAY_MS).toISOString(),
          lastError: "not_configured",
          updatedAt,
        }
        : {
          inquiryId: record.inquiryId,
          status: "pending",
          attempts,
          nextAttemptAt: new Date(deps.now().getTime() + backoffMs(attempts)).toISOString(),
          lastError: errorCode,
          updatedAt,
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
    await purgeExpired(deps, store, now);
  } catch (error) {
    logError(deps, { event: "purge_failed", errorName: error instanceof Error ? error.name : "Error" });
  }

  const existing = await store.getSubmission(parsed.submissionId);
  if (existing) {
    if (existing.fingerprint !== parsed.fingerprint) return { ok: false, error: "conflict" };
    const record = await store.getInquiry(existing.inquiryId);
    if (record) {
      const notification = await store.getNotification(record.inquiryId);
      logInfo(deps, { event: "replay", inquiryId: record.inquiryId });
      return { ok: true, created: false, inquiryId: record.inquiryId, notification: publicNotification(notification) };
    }
  }

  const allowed = await store.consumeRate(rateBucket("create", clientKey, now), deps.rateLimitPerHour);
  if (!allowed) return { ok: false, error: "rate_limited" };

  let lookup;
  try {
    lookup = await deps.scanDirectory.lookup(parsed.scanReference, now);
  } catch (error) {
    logError(deps, { event: "scan_lookup_failed", errorName: error instanceof Error ? error.name : "Error" });
    return { ok: false, error: "scan_unavailable" };
  }
  if (lookup.status === "not_found") return { ok: false, error: "scan_not_found" };
  if (lookup.status === "expired") return { ok: false, error: "scan_expired" };
  if (lookup.status === "invalid") return { ok: false, error: "scan_invalid" };

  const snapshot = copyScanSnapshot(parsed.scanReference, lookup.snapshot);
  if (!snapshot) return { ok: false, error: "scan_invalid" };

  const inquiryId = existing?.inquiryId ?? createInquiryId();
  if (!existing) {
    const claim = await store.claimSubmission({
      submissionId: parsed.submissionId,
      inquiryId,
      fingerprint: parsed.fingerprint,
    });
    if (claim === "exists") {
      const winner = await store.getSubmission(parsed.submissionId);
      if (!winner) return { ok: false, error: "save_failed" };
      return replayExisting(store, winner, parsed.fingerprint);
    }
  }

  const createdAt = now.toISOString();
  const record: InquiryRecord = {
    inquiryId,
    submissionId: parsed.submissionId,
    fingerprint: parsed.fingerprint,
    scanReference: parsed.scanReference,
    snapshot,
    name: parsed.name,
    email: parsed.email,
    goal: parsed.goal,
    phone: parsed.phone,
    createdAt,
    deleteAt: new Date(now.getTime() + deps.retentionDays * 24 * 60 * 60 * 1000).toISOString(),
  };

  try {
    await store.putInquiry(record);
    await store.putNotification({
      inquiryId,
      status: "pending",
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
      updatedAt: createdAt,
    });
  } catch (error) {
    await store.deleteInquiry(inquiryId).catch(() => undefined);
    await store.deleteNotification(inquiryId).catch(() => undefined);
    if (!existing) await store.releaseSubmission(parsed.submissionId).catch(() => undefined);
    logError(deps, { event: "save_failed", inquiryId, errorName: error instanceof Error ? error.name : "Error" });
    return { ok: false, error: "save_failed" };
  }

  logInfo(deps, { event: "saved", inquiryId, created: !existing });
  let notification: NotificationRecord;
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
      updatedAt: createdAt,
    };
  }

  await sweepDueNotifications(deps, 5).catch((error: unknown) => {
    logError(deps, { event: "sweep_failed", errorName: error instanceof Error ? error.name : "Error" });
  });

  return { ok: true, created: !existing, inquiryId, notification: publicNotification(notification) };
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
  await store.releaseSubmission(record.submissionId);
  await store.releaseLease(record.inquiryId);
  logInfo(deps, { event: "deleted", inquiryId: record.inquiryId });
  return { ok: true };
}

export async function sweepDueNotifications(deps: InquiryDeps, limit = 10): Promise<{
  due: number;
  sent: number;
  pending: number;
  unconfigured: number;
}> {
  const store = deps.store;
  if (!store) return { due: 0, sent: 0, pending: 0, unconfigured: 0 };
  const now = deps.now();
  await purgeExpired(deps, store, now);
  const notifications = await store.listNotifications();
  let due = 0;
  let sent = 0;
  let pending = 0;
  let unconfigured = 0;
  let attempted = 0;
  for (const note of notifications) {
    if (note.status === "sent") continue;
    if (note.nextAttemptAt && Date.parse(note.nextAttemptAt) > now.getTime()) continue;
    due += 1;
    if (attempted >= limit) continue;
    const record = await store.getInquiry(note.inquiryId);
    if (!record) {
      await store.deleteNotification(note.inquiryId);
      continue;
    }
    attempted += 1;
    const updated = await attemptDelivery(deps, store, record);
    if (updated.status === "sent") sent += 1;
    else if (updated.status === "unconfigured") unconfigured += 1;
    else pending += 1;
  }
  return { due, sent, pending, unconfigured };
}
