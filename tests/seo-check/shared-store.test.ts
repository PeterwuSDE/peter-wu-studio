import assert from "node:assert/strict";
import test from "node:test";
import { getDefaultStore, resetDefaultStoreForTests } from "../../shared/seo-check/store.ts";

const envKeys = ["VERCEL", "NODE_ENV", "SEO_CHECK_STORE_PATH", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"];

function environment(values: Record<string, string>) {
  const before = new Map(envKeys.map((key) => [key, process.env[key]]));
  for (const key of envKeys) delete process.env[key];
  Object.assign(process.env, values);
  resetDefaultStoreForTests();
  return () => {
    for (const [key, value] of before) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    resetDefaultStoreForTests();
  };
}

test("Vercel does not silently fall back to an isolated memory scan store", () => {
  const restore = environment({ VERCEL: "1" });
  try { assert.throws(() => getDefaultStore(), /shared.*storage|redis/i); }
  finally { restore(); }
});

test("a local file path cannot bypass the production shared-store requirement", () => {
  const restore = environment({ NODE_ENV: "production", SEO_CHECK_STORE_PATH: "/tmp/unused-seo-scan-store.json" });
  try { assert.throws(() => getDefaultStore(), /shared.*storage|redis/i); }
  finally { restore(); }
});

test("partial Redis credentials fail closed even during local development", () => {
  const restore = environment({ UPSTASH_REDIS_REST_URL: "https://redis.example" });
  try { assert.throws(() => getDefaultStore(), /redis|storage/i); }
  finally { restore(); }
});

test("local development without shared credentials still supports its memory adapter", async () => {
  const restore = environment({ NODE_ENV: "development" });
  try { assert.equal(await getDefaultStore().getByScanId("scan_unknown", Date.now()), null); }
  finally { restore(); }
});

test("both supported credential pairs select shared REST storage and never fall back on an outage", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls += 1; return new Response("unavailable", { status: 503 }); });
  for (const credentials of [
    { UPSTASH_REDIS_REST_URL: "https://redis.example", UPSTASH_REDIS_REST_TOKEN: "fixture" },
    { KV_REST_API_URL: "https://redis.example", KV_REST_API_TOKEN: "fixture" },
  ]) {
    const restore = environment({ VERCEL: "1", ...credentials });
    try { await assert.rejects(getDefaultStore().getByScanId("scan_outage", Date.now()), /unavailable/); }
    finally { restore(); }
  }
  assert.equal(calls, 2);
});

test("an unconfigured production scan returns a readable unavailable response without fetching the website", async () => {
  const restore = environment({ VERCEL: "1" });
  try {
    const { handleSeoCheckRequest } = await import("../../shared/seo-check/http.ts");
    const response = await handleSeoCheckRequest(new Request("https://www.nlstudio.io/api/seo-check", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/", requestId: "req_unconfigured" }),
    }), {
      resolver: { async lookup() { assert.fail("unconfigured scans must not resolve the target"); } },
      connector: { async request() { assert.fail("unconfigured scans must not fetch the target"); } },
    });
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.status, "unavailable");
    assert.equal(body.scanId, null);
    assert.deepEqual(body.findings, []);
    assert.match(body.message, /unavailable/i);
  } finally { restore(); }
});
