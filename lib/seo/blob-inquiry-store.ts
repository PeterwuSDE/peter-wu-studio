import type { InquiryNotification, InquiryRecord, InquiryStore, MaintenancePage, SubmissionClaim } from "./inquiry-store.ts";

/**
 * Narrow blob client so tests can stand in for @vercel/blob.
 * Production writes use a private store and conditional create for claims.
 */
export interface PrivateBlobClient {
  put(pathname: string, body: string, options: { allowOverwrite: boolean }): Promise<void>;
  get(pathname: string): Promise<string | null>;
  del(pathname: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  listPage(prefix: string, cursor: string | undefined, limit: number): Promise<{ paths: string[]; nextCursor: string | null }>;
}

const ROOT = "seo-inquiries";

function submissionPath(requestId: string): string {
  return `${ROOT}/submissions/${requestId}.json`;
}

function inquiryPath(inquiryId: string): string {
  return `${ROOT}/records/${inquiryId}.json`;
}

function pendingNotificationPath(inquiryId: string): string {
  return `${ROOT}/notifications/pending/${inquiryId}.json`;
}

function sentNotificationPath(inquiryId: string): string {
  return `${ROOT}/notifications/sent/${inquiryId}.json`;
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

function maintenancePath(kind: "inquiries" | "notifications"): string {
  return `${ROOT}/maintenance/${kind}.json`;
}

async function maintenancePage<T>(
  client: PrivateBlobClient,
  kind: "inquiries" | "notifications",
  prefix: string,
  limit: number,
): Promise<MaintenancePage<T>> {
  const progress = await readJson<{ cursor: string | null }>(client, maintenancePath(kind));
  const page = await client.listPage(prefix, progress?.cursor ?? undefined, Math.min(25, Math.max(1, limit)));
  // A page contains at most 25 objects, keeping remote reads bounded even when
  // retained collections grow. Missing objects may have been deleted meanwhile.
  const records = await Promise.all(page.paths.map((pathname) => readJson<T>(client, pathname)));
  return { records: records.filter((record) => record !== null), nextCursor: page.nextCursor };
}

export function createBlobInquiryStore(client: PrivateBlobClient): InquiryStore {
  return {
    maintenance: {
      inquiryPage(limit) {
        return maintenancePage<InquiryRecord>(client, "inquiries", `${ROOT}/records/`, limit);
      },
      notificationPage(limit) {
        return maintenancePage<InquiryNotification>(client, "notifications", `${ROOT}/notifications/pending/`, limit);
      },
      async commit(kind, nextCursor) {
        await client.put(maintenancePath(kind), JSON.stringify({ cursor: nextCursor }), { allowOverwrite: true });
      },
    },
    async getSubmission(requestId) {
      return readJson<SubmissionClaim>(client, submissionPath(requestId));
    },
    async claimSubmission(claim) {
      try {
        await client.put(submissionPath(claim.requestId), JSON.stringify(claim), { allowOverwrite: false });
        return "claimed";
      } catch (error) {
        if (isBlobAlreadyExists(error)) return "exists";
        throw error;
      }
    },
    async releaseSubmission(requestId) {
      await client.del(submissionPath(requestId));
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
      const pendingPath = pendingNotificationPath(record.inquiryId);
      if (record.status === "sent") {
        // Publish the dominant receipt before removing the queue entry. If the
        // response is lost, readers still see sent and will never resend it.
        await client.put(sentNotificationPath(record.inquiryId), JSON.stringify(record), { allowOverwrite: true });
        await client.del(pendingPath);
      } else {
        const sent = await readJson<InquiryNotification>(client, sentNotificationPath(record.inquiryId));
        if (sent) {
          await client.del(pendingPath);
          return;
        }
        await client.put(pendingPath, JSON.stringify(record), { allowOverwrite: true });
      }
    },
    async getNotification(inquiryId) {
      return await readJson<InquiryNotification>(client, sentNotificationPath(inquiryId))
        ?? readJson<InquiryNotification>(client, pendingNotificationPath(inquiryId));
    },
    async deleteNotification(inquiryId) {
      await client.del(pendingNotificationPath(inquiryId));
      await client.del(sentNotificationPath(inquiryId));
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
      const records = new Map<string, InquiryNotification>();
      for (const pathname of paths) {
        const record = await readJson<InquiryNotification>(client, pathname);
        if (record && (record.status === "sent" || records.get(record.inquiryId)?.status !== "sent")) {
          records.set(record.inquiryId, record);
        }
      }
      return [...records.values()];
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

  async listPage(prefix: string, cursor: string | undefined, limit: number) {
    const remaining = [...this.objects.keys()].filter((key) => key.startsWith(prefix) && (!cursor || key > cursor)).sort();
    const paths = remaining.slice(0, limit);
    return { paths, nextCursor: remaining.length > limit ? paths.at(-1) ?? null : null };
  }
}
