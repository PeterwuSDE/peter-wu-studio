import assert from "node:assert/strict";
import test from "node:test";
import { createRedisRestExecutor, createRedisStore, type RedisExecutor } from "../../shared/seo-check/redis-store.ts";
import type { StoredScan } from "../../shared/seo-check/store.ts";

test("Redis REST sends authenticated commands without permitting credential redirects", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const execute = createRedisRestExecutor("https://redis.example/", "fixture-token", async (input, init) => {
    calls.push({ url: String(input), init: init! });
    return Response.json({ result: "stored-value" });
  });
  assert.equal(await execute(["GET", "fixture-key"]), "stored-value");
  assert.equal(calls[0].url, "https://redis.example/");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(new Headers(calls[0].init.headers).get("authorization"), "Bearer fixture-token");
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), ["GET", "fixture-key"]);
  assert.ok(calls[0].init.signal instanceof AbortSignal);
  assert.throws(() => createRedisRestExecutor("http://redis.example/", "token"), /configuration/);
  assert.throws(() => createRedisRestExecutor("https://token@redis.example/", "token"), /configuration/);
});

test("Redis REST failure and malformed replies reject instead of pretending storage succeeded", async () => {
  for (const response of [
    new Response("unavailable", { status: 503 }),
    Response.json({ error: "backend-secret-fixture", result: null }),
    Response.json({ wrong: "envelope" }),
  ]) {
    const execute = createRedisRestExecutor("https://redis.example/", "token", async () => response);
    await assert.rejects(execute(["GET", "key"]), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.doesNotMatch(error.message, /backend-secret-fixture|token@/);
      return true;
    });
  }
});

test("independent adapters read a retained scan after its cache expires, then enforce retention", async () => {
  const values = new Map<string, string>();
  const writes: (string | number)[][] = [];
  // Only the external Redis command boundary is replaced. EVAL publication is
  // atomic at this boundary; actual Lua execution is an additional integration check.
  const execute: RedisExecutor = async (command) => {
    if (command[0] === "GET") return values.get(String(command[1])) ?? null;
    if (command[0] === "SET") { values.set(String(command[1]), String(command[2])); return "OK"; }
    assert.equal(command[0], "EVAL");
    assert.equal(command[2], 3);
    writes.push(command);
    values.set(String(command[3]), String(command[6]));
    values.set(String(command[4]), String(command[9]));
    values.set(String(command[5]), String(command[10]));
    return 1;
  };
  let now = Date.parse("2026-01-01T00:00:00Z");
  const first = createRedisStore(execute, { now: () => now });
  const second = createRedisStore(execute, { now: () => now });
  const scan = {
    scanId: "scan_shared_fixture", requestId: "req_shared_fixture", normalizedUrl: "https://example.com/",
    ruleVersion: "fixture", checkedAt: new Date(now).toISOString(), cacheExpiresAt: now + 86_400_000,
    retainUntil: now + 604_800_000, evaluation: { fixture: "no HTML" },
  } as unknown as StoredScan;
  await first.putScan(scan, "fixture-cache");
  assert.equal(writes.length, 1);
  assert.equal(writes[0][7], 604_800_000);
  assert.equal(writes[0][8], 86_400_000);
  assert.deepEqual(await second.getFreshCache("fixture-cache", now), scan);
  assert.equal((await second.getRequestBinding("req_shared_fixture", now))?.scanId, "scan_shared_fixture");
  now += 86_400_001;
  assert.equal(await second.getFreshCache("fixture-cache", now), null);
  assert.deepEqual(await second.getByScanId("scan_shared_fixture", now), scan);
  now = scan.retainUntil;
  assert.equal(await second.getByScanId("scan_shared_fixture", now), null);
});

test("quota decisions use one atomic command and preserve backend rejection", async () => {
  const calls: (string | number)[][] = [];
  const replies: unknown[] = [[0, 120], [1, 0], 0, 1];
  const store = createRedisStore(async (command) => { calls.push(command); return replies.shift(); });
  const input = { ip: "203.0.113.9", now: 1000, kind: "new" as const, windowMs: 3_600_000, newLimit: 5, cacheLimit: 60 };
  assert.deepEqual(await store.consumeRate(input), { ok: false, retryAfterSeconds: 120, limit: "ip_new" });
  assert.deepEqual(await store.consumeRate({ ...input, kind: "cache" }), { ok: true });
  assert.deepEqual(await store.consumeDaily(1000, 200), { ok: false });
  assert.deepEqual(await store.consumeDaily(1000, 200), { ok: true });
  assert.equal(calls.length, 4);
  for (const command of calls) {
    assert.equal(command[0], "EVAL");
    assert.equal(command[2], 1);
    assert.doesNotMatch(String(command[3]), /203\.0\.113\.9/);
  }
  assert.deepEqual(calls[0].slice(4), [1000, 3_600_000, "new", 5]);
  assert.deepEqual(calls[1].slice(4), [1000, 3_600_000, "cache", 60]);
  assert.deepEqual(await store.consumeDaily(1000, null), { ok: true });
  assert.equal(calls.length, 4);
});

test("unexpected quota responses fail closed", async () => {
  const store = createRedisStore(async () => null);
  await assert.rejects(store.consumeDaily(1000, 200));
  await assert.rejects(store.consumeRate({ ip: "fixture", now: 1000, kind: "new", windowMs: 1000, newLimit: 5, cacheLimit: 60 }));
});
