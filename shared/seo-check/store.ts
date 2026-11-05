import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Evaluation } from "./contract.ts";
import { redisStoreFromEnv } from "./redis-store.ts";

export interface StoredScan {
  scanId: string;
  requestId: string;
  normalizedUrl: string;
  ruleVersion: string;
  checkedAt: string;
  cacheExpiresAt: number;
  retainUntil: number;
  evaluation: Evaluation;
}

export interface RequestBinding {
  normalizedUrl: string;
  scanId: string;
  expiresAt: number;
}

export type RateDecision =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number; limit: "ip_new" | "ip_cache" };

export interface SeoCheckStore {
  sweep(now: number): Promise<void>;
  getFreshCache(cacheKey: string, now: number): Promise<StoredScan | null>;
  getByScanId(scanId: string, now: number): Promise<StoredScan | null>;
  getRequestBinding(requestId: string, now: number): Promise<RequestBinding | null>;
  putScan(scan: StoredScan, cacheKey: string): Promise<void>;
  bindRequest(requestId: string, normalizedUrl: string, scanId: string, expiresAt: number): Promise<void>;
  consumeRate(input: {
    ip: string;
    now: number;
    kind: "new" | "cache";
    windowMs: number;
    newLimit: number;
    cacheLimit: number;
  }): Promise<RateDecision>;
  consumeDaily(now: number, cap: number | null): Promise<{ ok: true } | { ok: false }>;
  listScans(): Promise<StoredScan[]>;
}

interface RateBucket {
  windowStart: number;
  fresh: number;
  cached: number;
}

interface State {
  scans: Map<string, StoredScan>;
  cache: Map<string, string>;
  requests: Map<string, RequestBinding>;
  rates: Map<string, RateBucket>;
  daily: Map<string, number>;
}

interface PersistedState {
  scans: StoredScan[];
  cache: [string, string][];
  requests: [string, RequestBinding][];
  rates: [string, RateBucket][];
  daily: [string, number][];
}

function emptyState(): State {
  return {
    scans: new Map(),
    cache: new Map(),
    requests: new Map(),
    rates: new Map(),
    daily: new Map(),
  };
}

function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function createStore(state: State, persist: () => Promise<void>): SeoCheckStore {
  return {
    async sweep(now) {
      let changed = false;
      for (const [id, scan] of state.scans) {
        if (scan.retainUntil <= now) {
          state.scans.delete(id);
          changed = true;
        }
      }
      for (const [key, id] of state.cache) {
        if (!state.scans.has(id)) {
          state.cache.delete(key);
          changed = true;
        }
      }
      for (const [id, binding] of state.requests) {
        if (binding.expiresAt <= now || !state.scans.has(binding.scanId)) {
          state.requests.delete(id);
          changed = true;
        }
      }
      for (const [ip, bucket] of state.rates) {
        if (now - bucket.windowStart > 48 * 60 * 60 * 1000) {
          state.rates.delete(ip);
          changed = true;
        }
      }
      const today = utcDay(now);
      for (const day of state.daily.keys()) {
        if (day < today) {
          state.daily.delete(day);
          changed = true;
        }
      }
      if (changed) await persist();
    },
    async getFreshCache(cacheKey, now) {
      const scanId = state.cache.get(cacheKey);
      if (!scanId) return null;
      const scan = state.scans.get(scanId);
      if (!scan || scan.cacheExpiresAt <= now || scan.retainUntil <= now) return null;
      return scan;
    },
    async getByScanId(scanId, now) {
      const scan = state.scans.get(scanId);
      if (!scan || scan.retainUntil <= now) return null;
      return scan;
    },
    async getRequestBinding(requestId, now) {
      const binding = state.requests.get(requestId);
      if (!binding || binding.expiresAt <= now || !state.scans.has(binding.scanId)) return null;
      return binding;
    },
    async putScan(scan, cacheKey) {
      state.scans.set(scan.scanId, scan);
      state.cache.set(cacheKey, scan.scanId);
      state.requests.set(scan.requestId, {
        normalizedUrl: scan.normalizedUrl,
        scanId: scan.scanId,
        expiresAt: scan.cacheExpiresAt,
      });
      await persist();
    },
    async bindRequest(requestId, normalizedUrl, scanId, expiresAt) {
      state.requests.set(requestId, { normalizedUrl, scanId, expiresAt });
      await persist();
    },
    async consumeRate(input) {
      let bucket = state.rates.get(input.ip);
      if (!bucket || input.now - bucket.windowStart >= input.windowMs) {
        bucket = { windowStart: input.now, fresh: 0, cached: 0 };
        state.rates.set(input.ip, bucket);
      }
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.windowStart + input.windowMs - input.now) / 1000));
      if (input.kind === "cache") {
        if (bucket.cached >= input.cacheLimit) return { ok: false, retryAfterSeconds, limit: "ip_cache" };
        bucket.cached += 1;
      } else if (bucket.fresh >= input.newLimit) {
        return { ok: false, retryAfterSeconds, limit: "ip_new" };
      } else {
        bucket.fresh += 1;
      }
      await persist();
      return { ok: true };
    },
    async consumeDaily(now, cap) {
      if (cap == null) return { ok: true };
      const day = utcDay(now);
      const count = state.daily.get(day) ?? 0;
      if (count >= cap) return { ok: false };
      state.daily.set(day, count + 1);
      await persist();
      return { ok: true };
    },
    async listScans() {
      return [...state.scans.values()];
    },
  };
}

export function createMemoryStore(): SeoCheckStore {
  return createStore(emptyState(), async () => {});
}

function dump(state: State): PersistedState {
  return {
    scans: [...state.scans.values()],
    cache: [...state.cache.entries()],
    requests: [...state.requests.entries()],
    rates: [...state.rates.entries()],
    daily: [...state.daily.entries()],
  };
}

function revive(raw: unknown): State {
  if (!raw || typeof raw !== "object") return emptyState();
  const parsed = raw as Partial<PersistedState>;
  return {
    scans: new Map((parsed.scans ?? []).map((scan) => [scan.scanId, scan])),
    cache: new Map(parsed.cache ?? []),
    requests: new Map(parsed.requests ?? []),
    rates: new Map(parsed.rates ?? []),
    daily: new Map(parsed.daily ?? []),
  };
}

export function createFileStore(filePath: string): SeoCheckStore {
  const state = loadState(filePath);
  return createStore(state, async () => writeState(filePath, state));
}

function loadState(filePath: string): State {
  try {
    return revive(JSON.parse(readFileSync(filePath, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyState();
    throw error;
  }
}

function writeState(filePath: string, state: State) {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(dump(state)));
  renameSync(tmp, filePath);
}

let singleton: SeoCheckStore | undefined;

export function getDefaultStore(): SeoCheckStore {
  if (!singleton) {
    const shared = redisStoreFromEnv(process.env);
    if (shared) return singleton = shared;
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      throw new Error("Redis shared scan storage is not configured");
    }
    const filePath = process.env.SEO_CHECK_STORE_PATH;
    singleton = filePath ? createFileStore(filePath) : createMemoryStore();
  }
  return singleton;
}

export function resetDefaultStoreForTests() {
  singleton = undefined;
}
