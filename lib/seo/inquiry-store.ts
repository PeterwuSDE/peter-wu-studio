import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { SeoInquiryRecord, SeoNotificationRecord } from "../../shared/seo-check/contract.ts";

export type InquiryRecord = SeoInquiryRecord;

export interface InquiryNotification extends SeoNotificationRecord {
  lastError: string | null;
}

export interface SubmissionClaim {
  requestId: string;
  inquiryId: string;
  fingerprint: string;
}

export interface InquiryStore {
  getSubmission(requestId: string): Promise<SubmissionClaim | null>;
  /**
   * Create the submission claim once. A second call with the same id must
   * leave the original claim untouched and return "exists".
   */
  claimSubmission(claim: SubmissionClaim): Promise<"claimed" | "exists">;
  releaseSubmission(requestId: string): Promise<void>;
  putInquiry(record: InquiryRecord): Promise<void>;
  getInquiry(inquiryId: string): Promise<InquiryRecord | null>;
  deleteInquiry(inquiryId: string): Promise<void>;
  putNotification(record: InquiryNotification): Promise<void>;
  getNotification(inquiryId: string): Promise<InquiryNotification | null>;
  deleteNotification(inquiryId: string): Promise<void>;
  listInquiries(): Promise<InquiryRecord[]>;
  listNotifications(): Promise<InquiryNotification[]>;
  /** Return false when this key is already at `limit` for the current window. */
  consumeRate(key: string, limit: number): Promise<boolean>;
  /** Return false when another worker holds an unexpired lease. */
  tryLease(inquiryId: string, now: Date, ttlMs: number): Promise<boolean>;
  releaseLease(inquiryId: string): Promise<void>;
}

interface RateBucket {
  count: number;
}

export class MemoryInquiryStore implements InquiryStore {
  readonly submissions = new Map<string, SubmissionClaim>();
  readonly inquiries = new Map<string, InquiryRecord>();
  readonly notifications = new Map<string, InquiryNotification>();
  readonly rates = new Map<string, RateBucket>();
  readonly leases = new Map<string, string>();

  async getSubmission(requestId: string): Promise<SubmissionClaim | null> {
    return this.submissions.get(requestId) ?? null;
  }

  async claimSubmission(claim: SubmissionClaim): Promise<"claimed" | "exists"> {
    if (this.submissions.has(claim.requestId)) return "exists";
    this.submissions.set(claim.requestId, { ...claim });
    return "claimed";
  }

  async releaseSubmission(requestId: string): Promise<void> {
    this.submissions.delete(requestId);
  }

  async putInquiry(record: InquiryRecord): Promise<void> {
    this.inquiries.set(record.inquiryId, structuredClone(record));
  }

  async getInquiry(inquiryId: string): Promise<InquiryRecord | null> {
    const record = this.inquiries.get(inquiryId);
    return record ? structuredClone(record) : null;
  }

  async deleteInquiry(inquiryId: string): Promise<void> {
    this.inquiries.delete(inquiryId);
  }

  async putNotification(record: InquiryNotification): Promise<void> {
    this.notifications.set(record.inquiryId, { ...record });
  }

  async getNotification(inquiryId: string): Promise<InquiryNotification | null> {
    const record = this.notifications.get(inquiryId);
    return record ? { ...record } : null;
  }

  async deleteNotification(inquiryId: string): Promise<void> {
    this.notifications.delete(inquiryId);
  }

  async listInquiries(): Promise<InquiryRecord[]> {
    return [...this.inquiries.values()].map((record) => structuredClone(record));
  }

  async listNotifications(): Promise<InquiryNotification[]> {
    return [...this.notifications.values()].map((record) => ({ ...record }));
  }

  async consumeRate(key: string, limit: number): Promise<boolean> {
    const bucket = this.rates.get(key) ?? { count: 0 };
    if (bucket.count >= limit) return false;
    bucket.count += 1;
    this.rates.set(key, bucket);
    return true;
  }

  async tryLease(inquiryId: string, now: Date, ttlMs: number): Promise<boolean> {
    const current = this.leases.get(inquiryId);
    if (current && Date.parse(current) > now.getTime()) return false;
    this.leases.set(inquiryId, new Date(now.getTime() + ttlMs).toISOString());
    return true;
  }

  async releaseLease(inquiryId: string): Promise<void> {
    this.leases.delete(inquiryId);
  }
}

interface InquiryFileSnapshot {
  submissions: SubmissionClaim[];
  inquiries: InquiryRecord[];
  notifications: InquiryNotification[];
  rates: [string, { count: number }][];
}

/**
 * Local JSON file used when Vercel Blob is not configured.
 * One long-running Node process, such as `vinext start`, keeps this store.
 */
export class FileInquiryStore extends MemoryInquiryStore {
  readonly filePath: string;

  constructor(filePath: string) {
    super();
    this.filePath = filePath;
    this.load();
  }

  private load() {
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, "utf8")) as InquiryFileSnapshot;
      for (const claim of parsed.submissions ?? []) this.submissions.set(claim.requestId, claim);
      for (const record of parsed.inquiries ?? []) this.inquiries.set(record.inquiryId, record);
      for (const record of parsed.notifications ?? []) this.notifications.set(record.inquiryId, record);
      for (const [key, bucket] of parsed.rates ?? []) this.rates.set(key, bucket);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  private persist() {
    const snapshot: InquiryFileSnapshot = {
      submissions: [...this.submissions.values()],
      inquiries: [...this.inquiries.values()],
      notifications: [...this.notifications.values()],
      rates: [...this.rates.entries()],
    };
    mkdirSync(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(snapshot));
    renameSync(tmp, this.filePath);
  }

  override async claimSubmission(claim: SubmissionClaim) {
    const result = await super.claimSubmission(claim);
    this.persist();
    return result;
  }

  override async releaseSubmission(requestId: string) {
    await super.releaseSubmission(requestId);
    this.persist();
  }

  override async putInquiry(record: InquiryRecord) {
    await super.putInquiry(record);
    this.persist();
  }

  override async deleteInquiry(inquiryId: string) {
    await super.deleteInquiry(inquiryId);
    this.persist();
  }

  override async putNotification(record: InquiryNotification) {
    await super.putNotification(record);
    this.persist();
  }

  override async deleteNotification(inquiryId: string) {
    await super.deleteNotification(inquiryId);
    this.persist();
  }

  override async consumeRate(key: string, limit: number) {
    const allowed = await super.consumeRate(key, limit);
    this.persist();
    return allowed;
  }
}
