import { randomBytes } from "node:crypto";
import { DEFAULT_CONFIG, type SeoCheckConfig } from "./config.ts";
import {
  SEO_CHECK_REQUEST_ID_PATTERN,
  httpStatusFor,
  normalizeLocale,
  sanitizePlainText,
  type SeoCheckLocale,
  type SeoCheckResponse,
  type SeoScanSnapshot,
} from "./contract.ts";
import { evaluatePage } from "./evaluate.ts";
import { fetchPage, type DnsResolver, type PageConnector } from "./fetch-page.ts";
import { normalizePublicUrl } from "./network-policy.ts";
import {
  conflictMessage,
  internalMessage,
  invalidRequestMessage,
  invalidTargetMessage,
  rateLimitMessage,
} from "./messages.ts";
import { errorResponse, renderStoredScan, snapshotFrom } from "./render.ts";
import { getDefaultStore, type SeoCheckStore, type StoredScan } from "./store.ts";

export interface SeoCheckDeps {
  store?: SeoCheckStore;
  resolver?: DnsResolver;
  connector?: PageConnector;
  now?: () => number;
  config?: Partial<SeoCheckConfig>;
  createScanId?: () => string;
}

type LeaderResult =
  | { kind: "scan"; scan: StoredScan }
  | { kind: "http"; httpStatus: number; body: SeoCheckResponse };

const inflight = new WeakMap<SeoCheckStore, Map<string, Promise<LeaderResult>>>();

export function createScanId(): string {
  return `scan_${randomBytes(16).toString("base64url")}`;
}

export async function runSeoCheck(
  input: { url: unknown; locale: unknown; requestId: unknown; clientIp: string },
  deps: SeoCheckDeps = {},
): Promise<{ httpStatus: number; body: SeoCheckResponse }> {
  const config = { ...DEFAULT_CONFIG, ...deps.config };
  const nowFn = deps.now ?? Date.now;
  const store = deps.store ?? getDefaultStore();
  const locale = normalizeLocale(input.locale);
  const requestId = typeof input.requestId === "string" ? input.requestId : "";
  if (!locale || typeof input.url !== "string" || !SEO_CHECK_REQUEST_ID_PATTERN.test(requestId)) {
    return {
      httpStatus: 400,
      body: errorResponse({
        locale: locale ?? "en",
        requestId: sanitizePlainText(requestId, 80),
        status: "invalid_request",
        code: "invalid_request",
        message: invalidRequestMessage(locale ?? "en"),
      }),
    };
  }

  const clientIp = input.clientIp.trim() || "unknown";
  const now = nowFn();
  await store.sweep(now);
  const normalized = normalizePublicUrl(input.url);
  if (!normalized.ok) {
    const limited = await store.consumeRate({
      ip: clientIp,
      now: nowFn(),
      kind: "new",
      windowMs: config.ipWindowMs,
      newLimit: config.ipNewScanLimit,
      cacheLimit: config.ipCacheHitLimit,
    });
    if (!limited.ok) return rateResponse(locale, requestId, limited.retryAfterSeconds, limited.limit);
    return {
      httpStatus: 400,
      body: errorResponse({
        locale,
        requestId,
        normalizedUrl: normalized.sanitized,
        status: "invalid_target",
        code: normalized.code,
        message: invalidTargetMessage(locale),
      }),
    };
  }

  const binding = await store.getRequestBinding(requestId, nowFn());
  if (binding && binding.normalizedUrl !== normalized.normalized) {
    return {
      httpStatus: 409,
      body: errorResponse({
        locale,
        requestId,
        normalizedUrl: normalized.normalized,
        status: "invalid_request",
        code: "request_id_conflict",
        message: conflictMessage(locale),
      }),
    };
  }

  const cacheKey = `${config.ruleVersion}\n${normalized.normalized}`;
  const fresh = await store.getFreshCache(cacheKey, nowFn());
  if (fresh) return serveCached(store, config, fresh, locale, requestId, clientIp, nowFn);

  const pendingMap = inflightFor(store);
  const existing = pendingMap.get(cacheKey);
  if (existing) return serveShared(store, config, existing, locale, requestId, clientIp, nowFn);

  let resolveLeader: (result: LeaderResult) => void = () => {};
  const pending = new Promise<LeaderResult>((resolve) => {
    resolveLeader = resolve;
  });
  pendingMap.set(cacheKey, pending);
  void pending.finally(() => {
    if (pendingMap.get(cacheKey) === pending) pendingMap.delete(cacheKey);
  });
  void runLeader({
    store,
    config,
    deps,
    nowFn,
    locale,
    requestId,
    clientIp,
    cacheKey,
    normalizedUrl: normalized.normalized,
    target: normalized.url,
  }).then(resolveLeader, () => {
    resolveLeader({
      kind: "http",
      httpStatus: 500,
      body: errorResponse({
        locale,
        requestId,
        normalizedUrl: normalized.normalized,
        status: "unavailable",
        code: "internal_error",
        message: internalMessage(locale),
      }),
    });
  });
  return pending.then((result) => {
    if (result.kind === "http") return { httpStatus: result.httpStatus, body: result.body };
    return {
      httpStatus: httpStatusFor(result.scan.evaluation.code),
      body: renderStoredScan(result.scan, { locale, requestId, cached: false, maxBytes: config.maxBytes }),
    };
  });
}

export async function readStoredScan(
  scanId: string,
  locale: SeoCheckLocale,
  deps: Pick<SeoCheckDeps, "store" | "now" | "config"> = {},
): Promise<SeoScanSnapshot | null> {
  const store = deps.store ?? getDefaultStore();
  const config = { ...DEFAULT_CONFIG, ...deps.config };
  const now = deps.now?.() ?? Date.now();
  const scan = await store.getByScanId(scanId, now);
  if (!scan) return null;
  const body = renderStoredScan(scan, {
    locale,
    requestId: scan.requestId,
    cached: false,
    maxBytes: config.maxBytes,
  });
  return snapshotFrom(body);
}

async function runLeader(input: {
  store: SeoCheckStore;
  config: SeoCheckConfig;
  deps: SeoCheckDeps;
  nowFn: () => number;
  locale: SeoCheckLocale;
  requestId: string;
  clientIp: string;
  cacheKey: string;
  normalizedUrl: string;
  target: URL;
}): Promise<LeaderResult> {
  try {
    const rate = await input.store.consumeRate({
      ip: input.clientIp,
      now: input.nowFn(),
      kind: "new",
      windowMs: input.config.ipWindowMs,
      newLimit: input.config.ipNewScanLimit,
      cacheLimit: input.config.ipCacheHitLimit,
    });
    if (!rate.ok) {
      return { kind: "http", ...rateResponse(input.locale, input.requestId, rate.retryAfterSeconds, rate.limit) };
    }
    const daily = await input.store.consumeDaily(input.nowFn(), input.config.dailyCap);
    if (!daily.ok) {
      return { kind: "http", ...rateResponse(input.locale, input.requestId, null, "daily_cap") };
    }
    if (!input.deps.resolver || !input.deps.connector) {
      throw new Error("SEO check transport is not configured");
    }
    const fetched = await fetchPage({
      url: input.target,
      resolver: input.deps.resolver,
      connector: input.deps.connector,
      config: input.config,
      now: input.nowFn,
    });
    if (fetched.type === "blocked") {
      return {
        kind: "http",
        httpStatus: 400,
        body: errorResponse({
          locale: input.locale,
          requestId: input.requestId,
          normalizedUrl: input.normalizedUrl,
          status: "invalid_target",
          code: "blocked_target",
          message: invalidTargetMessage(input.locale),
          redirectCount: fetched.redirectCount,
        }),
      };
    }
    const evaluation = evaluatePage({ normalizedUrl: input.normalizedUrl, fetch: fetched });
    const checkedAtMs = input.nowFn();
    const success =
      evaluation.status === "completed" ||
      evaluation.status === "partial" ||
      evaluation.status === "too_large" ||
      evaluation.status === "unsupported_content";
    const scan: StoredScan = {
      scanId: (input.deps.createScanId ?? createScanId)(),
      requestId: input.requestId,
      normalizedUrl: input.normalizedUrl,
      ruleVersion: input.config.ruleVersion,
      checkedAt: new Date(checkedAtMs).toISOString(),
      cacheExpiresAt: checkedAtMs + (success ? input.config.successCacheTtlMs : input.config.failureCacheTtlMs),
      retainUntil: checkedAtMs + input.config.retentionMs,
      evaluation,
    };
    await input.store.putScan(scan, input.cacheKey);
    return { kind: "scan", scan };
  } catch {
    return {
      kind: "http",
      httpStatus: 500,
      body: errorResponse({
        locale: input.locale,
        requestId: input.requestId,
        normalizedUrl: input.normalizedUrl,
        status: "unavailable",
        code: "internal_error",
        message: internalMessage(input.locale),
      }),
    };
  }
}

async function serveCached(
  store: SeoCheckStore,
  config: SeoCheckConfig,
  scan: StoredScan,
  locale: SeoCheckLocale,
  requestId: string,
  clientIp: string,
  nowFn: () => number,
) {
  const decision = await store.consumeRate({
    ip: clientIp,
    now: nowFn(),
    kind: "cache",
    windowMs: config.ipWindowMs,
    newLimit: config.ipNewScanLimit,
    cacheLimit: config.ipCacheHitLimit,
  });
  if (!decision.ok) return rateResponse(locale, requestId, decision.retryAfterSeconds, decision.limit);
  await store.bindRequest(requestId, scan.normalizedUrl, scan.scanId, scan.cacheExpiresAt);
  return {
    httpStatus: httpStatusFor(scan.evaluation.code),
    body: renderStoredScan(scan, { locale, requestId, cached: true, maxBytes: config.maxBytes }),
  };
}

async function serveShared(
  store: SeoCheckStore,
  config: SeoCheckConfig,
  pending: Promise<LeaderResult>,
  locale: SeoCheckLocale,
  requestId: string,
  clientIp: string,
  nowFn: () => number,
) {
  const result = await pending;
  if (result.kind === "http") {
    return { httpStatus: result.httpStatus, body: { ...result.body, requestId } };
  }
  const decision = await store.consumeRate({
    ip: clientIp,
    now: nowFn(),
    kind: "cache",
    windowMs: config.ipWindowMs,
    newLimit: config.ipNewScanLimit,
    cacheLimit: config.ipCacheHitLimit,
  });
  if (!decision.ok) return rateResponse(locale, requestId, decision.retryAfterSeconds, decision.limit);
  await store.bindRequest(requestId, result.scan.normalizedUrl, result.scan.scanId, result.scan.cacheExpiresAt);
  return {
    httpStatus: httpStatusFor(result.scan.evaluation.code),
    body: renderStoredScan(result.scan, { locale, requestId, cached: true, maxBytes: config.maxBytes }),
  };
}

function rateResponse(
  locale: SeoCheckLocale,
  requestId: string,
  retryAfterSeconds: number | null,
  limit: "ip_new" | "ip_cache" | "daily_cap",
) {
  const code = limit === "daily_cap" ? "daily_cap" : limit === "ip_cache" ? "ip_rate_limit" : "ip_rate_limit";
  return {
    httpStatus: 429,
    body: errorResponse({
      locale,
      requestId,
      status: "rate_limited",
      code,
      message: rateLimitMessage(locale),
      retryAfterSeconds,
    }),
  };
}

function inflightFor(store: SeoCheckStore) {
  let map = inflight.get(store);
  if (!map) {
    map = new Map();
    inflight.set(store, map);
  }
  return map;
}
