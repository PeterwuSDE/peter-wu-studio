import type { InquiryRecord, NotificationRecord, SubmissionClaim } from "./contract.ts";
import type { InquiryStore } from "./inquiry-store.ts";

/**
 * Narrow blob client so tests can stand in for @vercel/blob.
 * Production writes use a private store and conditional create for claims.
 */
export interface PrivateBlobClient {
  put(pathname: string, body: string, options: { allowOverwrite: boolean }): Promise<void>;
  get(pathname: string): Promise<string | null>;
  del(pathname: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

const ROOT = "seo-inquiries";

function submissionPath(submissionId: string): string {
  return `${ROOT}/submissions/${submissionId}.json`;
}

function inquiryPath(inquiryId: string): string {
  return `${ROOT}/records/${inquiryId}.json`;
}

function notificationPath(inquiryId: string): string {
  return `${ROOT}/notifications/${inquiryId}.json`;
}

function ratePath(key: string): string {
  return `${ROOT}/rates/${key}.json`;
}

function leasePath(inquiryId: string): string {
  return `${ROOT}/leases/${inquiryId}.json`;
}

export function isBlobAlreadyExists(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { message?: unknown; name?: unknown; code?: unknown };
  const message = typeof record.message === "string" ? record.message : "";
  const name = typeof record.name === "string" ? record.name : "";
  const code = typeof record.code === "string" ? record.code : "";
  return /already exists/i.test(message) || name === "BlobAlreadyExistsError" || code === "blob_already_exists";
}

async function readJson<T>(client: PrivateBlobClient, pathname: string): Promise<T | null> {
  const raw = await client.get(pathname);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export function createBlobInquiryStore(client: PrivateBlobClient): InquiryStore {
  return {
    async getSubmission(submissionId) {
      return readJson<SubmissionClaim>(client, submissionPath(submissionId));
    },
    async claimSubmission(claim) {
      try {
        await client.put(submissionPath(claim.submissionId), JSON.stringify(claim), { allowOverwrite: false });
        return "claimed";
      } catch (error) {
        if (isBlobAlreadyExists(error)) return "exists";
        throw error;
      }
    },
    async releaseSubmission(submissionId) {
      await client.del(submissionPath(submissionId));
    },
    async putInquiry(record) {
      await client.put(inquiryPath(record.inquiryId), JSON.stringify(record), { allowOverwrite: true });
    },
    async getInquiry(inquiryId) {
      return readJson<InquiryRecord>(client, inquiryPath(inquiryId));
    },
    async deleteInquiry(inquiryId) {
      await client.del(inquiryPath(inquiryId));
    },
    async putNotification(record) {
      await client.put(notificationPath(record.inquiryId), JSON.stringify(record), { allowOverwrite: true });
    },
    async getNotification(inquiryId) {
      return readJson<NotificationRecord>(client, notificationPath(inquiryId));
    },
    async deleteNotification(inquiryId) {
      await client.del(notificationPath(inquiryId));
    },
    async listInquiries() {
      const paths = await client.list(`${ROOT}/records/`);
      const records: InquiryRecord[] = [];
      for (const pathname of paths) {
        const record = await readJson<InquiryRecord>(client, pathname);
        if (record) records.push(record);
      }
      return records;
    },
    async listNotifications() {
      const paths = await client.list(`${ROOT}/notifications/`);
      const records: NotificationRecord[] = [];
      for (const pathname of paths) {
        const record = await readJson<NotificationRecord>(client, pathname);
        if (record) records.push(record);
      }
      return records;
    },
    async consumeRate(key, limit) {
      const pathname = ratePath(key);
      const current = await readJson<{ count: number }>(client, pathname);
      const count = current?.count ?? 0;
      if (count >= limit) return false;
      await client.put(pathname, JSON.stringify({ count: count + 1 }), { allowOverwrite: true });
      return true;
    },
    async tryLease(inquiryId, now, ttlMs) {
      const pathname = leasePath(inquiryId);
      const until = new Date(now.getTime() + ttlMs).toISOString();
      try {
        await client.put(pathname, JSON.stringify({ until }), { allowOverwrite: false });
        return true;
      } catch (error) {
        if (!isBlobAlreadyExists(error)) throw error;
      }
      const current = await readJson<{ until: string }>(client, pathname);
      if (current && Date.parse(current.until) > now.getTime()) return false;
      await client.del(pathname);
      try {
        await client.put(pathname, JSON.stringify({ until }), { allowOverwrite: false });
        return true;
      } catch (error) {
        if (isBlobAlreadyExists(error)) return false;
        throw error;
      }
    },
    async releaseLease(inquiryId) {
      await client.del(leasePath(inquiryId));
    },
  };
}

export class MapBlobClient implements PrivateBlobClient {
  readonly objects = new Map<string, string>();

  async put(pathname: string, body: string, options: { allowOverwrite: boolean }): Promise<void> {
    if (!options.allowOverwrite && this.objects.has(pathname)) {
      throw Object.assign(new Error("This blob already exists"), { code: "blob_already_exists" });
    }
    this.objects.set(pathname, body);
  }

  async get(pathname: string): Promise<string | null> {
    return this.objects.get(pathname) ?? null;
  }

  async del(pathname: string): Promise<void> {
    this.objects.delete(pathname);
  }

  async list(prefix: string): Promise<string[]> {
    return [...this.objects.keys()].filter((key) => key.startsWith(prefix));
  }
}
