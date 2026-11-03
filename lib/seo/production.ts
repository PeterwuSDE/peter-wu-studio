import { createBlobInquiryStore } from "./blob-inquiry-store.ts";
import type { HttpDeps } from "./http.ts";
import type { InquiryLogger } from "./inquiry-service.ts";
import { FileInquiryStore, MemoryInquiryStore, type InquiryStore } from "./inquiry-store.ts";
import { createNotifierFromEnv } from "./notifier.ts";
import { createScanDirectory } from "./scan-directory.ts";

const DEFAULT_ORIGINS = [
  "https://www.nlstudio.io",
  "https://nlstudio.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

export function blobCredentialsConfigured(env: Record<string, string | undefined>): boolean {
  if (env.BLOB_READ_WRITE_TOKEN?.trim()) return true;
  return Boolean(env.BLOB_STORE_ID?.trim() && env.VERCEL_OIDC_TOKEN?.trim());
}

function integerEnv(value: string | undefined, fallback: number, min: number, max: number): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

export function inquirySettings(env: Record<string, string | undefined>) {
  const extra = (env.SEO_INQUIRY_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const retryTokens = [env.SEO_INQUIRY_RETRY_TOKEN, env.CRON_SECRET]
    .map((token) => token?.trim() ?? "")
    .filter(Boolean);
  return {
    retentionDays: integerEnv(env.SEO_INQUIRY_RETENTION_DAYS, 90, 1, 3650),
    rateLimitPerHour: integerEnv(env.SEO_INQUIRY_RATE_LIMIT_PER_HOUR, 10, 1, 1000),
    allowedOrigins: [...new Set([...DEFAULT_ORIGINS, ...extra])],
    retryTokens,
  };
}

let memoryStore: MemoryInquiryStore | null = null;
const fileStores = new Map<string, FileInquiryStore>();

function localInquiryStore(env: Record<string, string | undefined>): InquiryStore | null {
  if (env.SEO_INQUIRY_STORE === "off") return null;
  if (env.SEO_INQUIRY_STORE === "memory") {
    memoryStore ??= new MemoryInquiryStore();
    return memoryStore;
  }
  const filePath = env.SEO_INQUIRY_STORE_PATH?.trim() || (env.VERCEL ? "" : ".data/seo-inquiries.json");
  if (!filePath) return null;
  const existing = fileStores.get(filePath);
  if (existing) return existing;
  const created = new FileInquiryStore(filePath);
  fileStores.set(filePath, created);
  return created;
}

const logger: InquiryLogger = {
  info(event) {
    console.info(JSON.stringify(event));
  },
  error(event) {
    console.error(JSON.stringify(event));
  },
};

export async function createProductionDeps(
  env: Record<string, string | undefined> = process.env,
): Promise<HttpDeps> {
  const settings = inquirySettings(env);
  let store: HttpDeps["store"] = null;
  if (blobCredentialsConfigured(env)) {
    try {
      const { createVercelBlobClient } = await import("./vercel-blob-client.ts");
      store = createBlobInquiryStore(createVercelBlobClient());
    } catch (error) {
      logger.error({
        scope: "seo-inquiry",
        event: "blob_client_unavailable",
        errorName: error instanceof Error ? error.name : "Error",
      });
      store = null;
    }
  }
  store ??= localInquiryStore(env);

  return {
    store,
    notifier: createNotifierFromEnv(env),
    scanDirectory: createScanDirectory(),
    now: () => new Date(),
    retentionDays: settings.retentionDays,
    rateLimitPerHour: settings.rateLimitPerHour,
    allowedOrigins: settings.allowedOrigins,
    retryTokens: settings.retryTokens,
    logger,
  };
}
