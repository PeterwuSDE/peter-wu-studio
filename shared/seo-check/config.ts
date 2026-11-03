import { SEO_CHECK_RULE_VERSION } from "./contract.ts";

export interface SeoCheckConfig {
  ruleVersion: string;
  maxRedirects: number;
  timeoutMs: number;
  maxBytes: number;
  maxRawBytes: number;
  successCacheTtlMs: number;
  failureCacheTtlMs: number;
  ipWindowMs: number;
  ipNewScanLimit: number;
  ipCacheHitLimit: number;
  /** Null disables the daily cap. Zero rejects every new fetch. */
  dailyCap: number | null;
  retentionMs: number;
  allowedOrigins: string[];
  userAgent: string;
}

export const DEFAULT_CONFIG: SeoCheckConfig = {
  ruleVersion: SEO_CHECK_RULE_VERSION,
  maxRedirects: 3,
  timeoutMs: 12_000,
  maxBytes: 1024 * 1024,
  maxRawBytes: 8 * 1024 * 1024,
  successCacheTtlMs: 24 * 60 * 60 * 1000,
  failureCacheTtlMs: 2 * 60 * 1000,
  ipWindowMs: 60 * 60 * 1000,
  ipNewScanLimit: 5,
  ipCacheHitLimit: 60,
  dailyCap: 200,
  retentionMs: 7 * 24 * 60 * 60 * 1000,
  allowedOrigins: ["https://www.nlstudio.io", "https://nlstudio.io"],
  userAgent: "NorthlineHomepageCheck/1.0 (+https://www.nlstudio.io/seo)",
};

const LOCAL_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function integerInRange(value: string | undefined, fallback: number, min: number, max: number): number {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

function isExactOrigin(value: string): boolean {
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
}

export function configFromEnv(env: Record<string, string | undefined> = process.env): SeoCheckConfig {
  const allowedOrigins = [...DEFAULT_CONFIG.allowedOrigins];
  const extra = (env.SEO_CHECK_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  for (const origin of extra) {
    if (isExactOrigin(origin) && !allowedOrigins.includes(origin)) allowedOrigins.push(origin);
  }
  if (env.VERCEL_ENV !== "production") {
    for (const origin of LOCAL_DEV_ORIGINS) {
      if (!allowedOrigins.includes(origin)) allowedOrigins.push(origin);
    }
  }

  const dailyRaw = env.SEO_CHECK_DAILY_CAP?.trim().toLowerCase();
  let dailyCap: number | null = DEFAULT_CONFIG.dailyCap;
  if (dailyRaw === "unlimited") dailyCap = null;
  else if (dailyRaw) dailyCap = integerInRange(dailyRaw, DEFAULT_CONFIG.dailyCap ?? 200, 0, 1_000_000);

  return {
    ...DEFAULT_CONFIG,
    maxRedirects: integerInRange(env.SEO_CHECK_MAX_REDIRECTS, DEFAULT_CONFIG.maxRedirects, 0, 5),
    timeoutMs: integerInRange(env.SEO_CHECK_TIMEOUT_MS, DEFAULT_CONFIG.timeoutMs, 1000, 60_000),
    maxBytes: integerInRange(env.SEO_CHECK_MAX_BYTES, DEFAULT_CONFIG.maxBytes, 1024, 5 * 1024 * 1024),
    maxRawBytes: integerInRange(env.SEO_CHECK_MAX_RAW_BYTES, DEFAULT_CONFIG.maxRawBytes, 1024, 16 * 1024 * 1024),
    successCacheTtlMs: integerInRange(env.SEO_CHECK_SUCCESS_CACHE_TTL_MS, DEFAULT_CONFIG.successCacheTtlMs, 0, 30 * 24 * 60 * 60 * 1000),
    failureCacheTtlMs: integerInRange(env.SEO_CHECK_FAILURE_CACHE_TTL_MS, DEFAULT_CONFIG.failureCacheTtlMs, 0, 24 * 60 * 60 * 1000),
    ipWindowMs: integerInRange(env.SEO_CHECK_IP_WINDOW_MS, DEFAULT_CONFIG.ipWindowMs, 1000, 24 * 60 * 60 * 1000),
    ipNewScanLimit: integerInRange(env.SEO_CHECK_IP_LIMIT, DEFAULT_CONFIG.ipNewScanLimit, 1, 10_000),
    ipCacheHitLimit: integerInRange(env.SEO_CHECK_IP_CACHE_LIMIT, DEFAULT_CONFIG.ipCacheHitLimit, 1, 100_000),
    dailyCap,
    retentionMs: integerInRange(env.SEO_CHECK_RETENTION_MS, DEFAULT_CONFIG.retentionMs, 60_000, 365 * 24 * 60 * 60 * 1000),
    allowedOrigins,
  };
}
