import { createHash } from "node:crypto";
import type { RateDecision, RequestBinding, SeoCheckStore, StoredScan } from "./store.ts";

type RedisCommand = (string | number)[];
export type RedisExecutor = (command: RedisCommand) => Promise<unknown>;

/** An atomic check/increment; rejected requests do not extend the window. */
const RATE_SCRIPT = `
local start = tonumber(redis.call('HGET', KEYS[1], 'start'))
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
if not start or now - start >= window then
  start = now
  redis.call('HSET', KEYS[1], 'start', start, 'new', 0, 'cache', 0)
  redis.call('PEXPIRE', KEYS[1], window)
end
local count = tonumber(redis.call('HGET', KEYS[1], ARGV[3]) or '0')
if count >= tonumber(ARGV[4]) then
  return {0, math.max(1, math.ceil((start + window - now) / 1000))}
end
redis.call('HINCRBY', KEYS[1], ARGV[3], 1)
return {1, 0}
`;

const DAILY_SCRIPT = `
local count = tonumber(redis.call('GET', KEYS[1]) or '0')
if count >= tonumber(ARGV[1]) then return 0 end
redis.call('INCR', KEYS[1])
redis.call('PEXPIRE', KEYS[1], ARGV[2])
return 1
`;

/** Publish the retained scan, cache reference and request binding together. */
const PUT_SCRIPT = `
redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])
if tonumber(ARGV[3]) > 0 then
  redis.call('SET', KEYS[2], ARGV[4], 'PX', ARGV[3])
  redis.call('SET', KEYS[3], ARGV[5], 'PX', ARGV[3])
end
return 1
`;

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function readJson<T>(value: unknown): T | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("Invalid shared scan storage response");
  return JSON.parse(value) as T;
}

export function createRedisRestExecutor(
  endpoint: string,
  token: string,
  fetcher: typeof fetch = fetch,
): RedisExecutor {
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !token.trim()) {
    throw new Error("Invalid Redis REST storage configuration");
  }
  return async (command) => {
    // Bound storage work separately; never follow a redirect with credentials.
    const response = await fetcher(url.href, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(1500),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Shared scan storage is unavailable");
    const payload = await response.json() as { result?: unknown; error?: unknown };
    if (!payload || typeof payload !== "object" || payload.error || !("result" in payload)) {
      throw new Error("Shared scan storage command failed");
    }
    return payload.result;
  };
}

export function createRedisStore(
  execute: RedisExecutor,
  options: { prefix?: string; now?: () => number } = {},
): SeoCheckStore {
  const prefix = options.prefix ?? "northline:seo:{shared}:v1:";
  const now = options.now ?? Date.now;
  const key = (kind: string, value: string) => `${prefix}${kind}:${digest(value)}`;
  const readScan = async (scanId: string, at: number) => {
    const scan = readJson<StoredScan>(await execute(["GET", key("scan", scanId)]));
    return scan && scan.retainUntil > at ? scan : null;
  };
  return {
    // Redis key TTLs enforce retention without relying on incoming traffic.
    async sweep() {},
    getByScanId: readScan,
    async getFreshCache(cacheKey, at) {
      const scanId = await execute(["GET", key("cache", cacheKey)]);
      if (scanId === null) return null;
      if (typeof scanId !== "string") throw new Error("Invalid shared scan cache response");
      const scan = await readScan(scanId, at);
      return scan && scan.cacheExpiresAt > at ? scan : null;
    },
    async getRequestBinding(requestId, at) {
      const binding = readJson<RequestBinding>(await execute(["GET", key("request", requestId)]));
      if (!binding || binding.expiresAt <= at || !await readScan(binding.scanId, at)) return null;
      return binding;
    },
    async putScan(scan, cacheKey) {
      const at = now();
      const retainedMs = Math.floor(scan.retainUntil - at);
      if (retainedMs <= 0) throw new Error("Cannot store an expired scan");
      const cacheMs = Math.max(0, Math.min(retainedMs, Math.floor(scan.cacheExpiresAt - at)));
      const binding: RequestBinding = { normalizedUrl: scan.normalizedUrl, scanId: scan.scanId, expiresAt: scan.cacheExpiresAt };
      await execute(["EVAL", PUT_SCRIPT, 3, key("scan", scan.scanId), key("cache", cacheKey), key("request", scan.requestId),
        JSON.stringify(scan), retainedMs, cacheMs, scan.scanId, JSON.stringify(binding)]);
    },
    async bindRequest(requestId, normalizedUrl, scanId, expiresAt) {
      const ttl = Math.floor(expiresAt - now());
      if (ttl <= 0) return;
      await execute(["SET", key("request", requestId), JSON.stringify({ normalizedUrl, scanId, expiresAt }), "PX", ttl]);
    },
    async consumeRate(input) {
      const limit = input.kind === "new" ? input.newLimit : input.cacheLimit;
      const result = await execute(["EVAL", RATE_SCRIPT, 1, key("rate", input.ip), input.now, input.windowMs, input.kind, limit]);
      if (!Array.isArray(result) || result.length !== 2 || (result[0] !== 0 && result[0] !== 1)) {
        throw new Error("Invalid shared scan rate response");
      }
      if (result[0] === 1) return { ok: true };
      const wait = Number(result[1]);
      if (!Number.isFinite(wait) || wait < 1) throw new Error("Invalid shared scan rate response");
      return { ok: false, retryAfterSeconds: wait, limit: input.kind === "new" ? "ip_new" : "ip_cache" } as RateDecision;
    },
    async consumeDaily(at, cap) {
      if (cap === null) return { ok: true };
      const day = Math.floor(at / 86_400_000);
      const ttl = Math.max(1, (day + 1) * 86_400_000 - at);
      const result = await execute(["EVAL", DAILY_SCRIPT, 1, key("daily", String(day)), cap, ttl]);
      if (result !== 0 && result !== 1) throw new Error("Invalid shared scan daily response");
      return { ok: result === 1 };
    },
    async listScans() {
      const scans: StoredScan[] = [];
      let cursor = "0";
      do {
        const page = await execute(["SCAN", cursor, "MATCH", `${prefix}scan:*`, "COUNT", 100]);
        if (!Array.isArray(page) || typeof page[0] !== "string" || !Array.isArray(page[1])) {
          throw new Error("Invalid shared scan listing response");
        }
        cursor = page[0];
        for (const pathname of page[1]) {
          if (typeof pathname !== "string") throw new Error("Invalid shared scan key");
          const scan = readJson<StoredScan>(await execute(["GET", pathname]));
          if (scan && scan.retainUntil > now()) scans.push(scan);
        }
      } while (cursor !== "0");
      return scans;
    },
  };
}

export function redisStoreFromEnv(env: Record<string, string | undefined>): SeoCheckStore | null {
  const useUpstash = Boolean(env.UPSTASH_REDIS_REST_URL || env.UPSTASH_REDIS_REST_TOKEN);
  const endpoint = (useUpstash ? env.UPSTASH_REDIS_REST_URL : env.KV_REST_API_URL)?.trim();
  const token = (useUpstash ? env.UPSTASH_REDIS_REST_TOKEN : env.KV_REST_API_TOKEN)?.trim();
  if (!endpoint && !token) return null;
  if (!endpoint || !token) throw new Error("Redis REST shared storage requires a URL and token");
  const scope = env.VERCEL_ENV === "production" || env.NODE_ENV === "production" && !env.VERCEL_ENV ? "production" : "preview";
  return createRedisStore(createRedisRestExecutor(endpoint, token), { prefix: `northline:seo:{${scope}}:v1:` });
}
