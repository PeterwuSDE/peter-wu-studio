import type { InquiryRecord, NotificationRecord, SubmissionClaim } from "./contract.ts";

export interface InquiryStore {
  getSubmission(submissionId: string): Promise<SubmissionClaim | null>;
  /**
   * Create the submission claim once. A second call with the same id must
   * leave the original claim untouched and return "exists".
   */
  claimSubmission(claim: SubmissionClaim): Promise<"claimed" | "exists">;
  releaseSubmission(submissionId: string): Promise<void>;
  putInquiry(record: InquiryRecord): Promise<void>;
  getInquiry(inquiryId: string): Promise<InquiryRecord | null>;
  deleteInquiry(inquiryId: string): Promise<void>;
  putNotification(record: NotificationRecord): Promise<void>;
  getNotification(inquiryId: string): Promise<NotificationRecord | null>;
  deleteNotification(inquiryId: string): Promise<void>;
  listInquiries(): Promise<InquiryRecord[]>;
  listNotifications(): Promise<NotificationRecord[]>;
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
  readonly notifications = new Map<string, NotificationRecord>();
  readonly rates = new Map<string, RateBucket>();
  readonly leases = new Map<string, string>();

  async getSubmission(submissionId: string): Promise<SubmissionClaim | null> {
    return this.submissions.get(submissionId) ?? null;
  }

  async claimSubmission(claim: SubmissionClaim): Promise<"claimed" | "exists"> {
    if (this.submissions.has(claim.submissionId)) return "exists";
    this.submissions.set(claim.submissionId, { ...claim });
    return "claimed";
  }

  async releaseSubmission(submissionId: string): Promise<void> {
    this.submissions.delete(submissionId);
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

  async putNotification(record: NotificationRecord): Promise<void> {
    this.notifications.set(record.inquiryId, { ...record });
  }

  async getNotification(inquiryId: string): Promise<NotificationRecord | null> {
    const record = this.notifications.get(inquiryId);
    return record ? { ...record } : null;
  }

  async deleteNotification(inquiryId: string): Promise<void> {
    this.notifications.delete(inquiryId);
  }

  async listInquiries(): Promise<InquiryRecord[]> {
    return [...this.inquiries.values()].map((record) => structuredClone(record));
  }

  async listNotifications(): Promise<NotificationRecord[]> {
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
