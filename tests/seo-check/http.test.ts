import assert from "node:assert/strict";
import test from "node:test";
import { configFromEnv } from "../../shared/seo-check/config.ts";
import { clientAddress, handleSeoCheckRequest } from "../../shared/seo-check/http.ts";
import { createMemoryStore } from "../../shared/seo-check/store.ts";
import { htmlResult, pageHtml, publicResolver, scriptedConnector } from "./helpers.ts";

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://www.nlstudio.io/api/seo-check", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://www.nlstudio.io", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("POST returns the scan and only allows the Northline origin", async () => {
  const transport = scriptedConnector(() => htmlResult(pageHtml()));
  const response = await handleSeoCheckRequest(post({
    url: "https://example.com/",
    requestId: "req_12345678",
    locale: "zh-CN",
  }), {
    store: createMemoryStore(),
    resolver: publicResolver().resolver,
    connector: transport.connector,
    now: () => Date.parse("2026-04-01T00:00:00.000Z"),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://www.nlstudio.io");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  const body = await response.json();
  assert.equal(body.locale, "zh");
  assert.equal(body.normalizedUrl, "https://example.com/");

  const evil = await handleSeoCheckRequest(post({
    url: "https://example.com/other",
    requestId: "req_87654321",
  }, { origin: "https://evil.example" }), {
    store: createMemoryStore(),
    resolver: publicResolver().resolver,
    connector: transport.connector,
  });
  assert.equal(evil.headers.get("access-control-allow-origin"), null);
  assert.equal(evil.status, 200);
});

test("malformed requests and the wrong method do not scan", async () => {
  const transport = scriptedConnector(() => htmlResult(pageHtml()));
  const deps = { store: createMemoryStore(), resolver: publicResolver().resolver, connector: transport.connector };
  const bad = await handleSeoCheckRequest(post("{"), deps);
  assert.equal(bad.status, 400);
  const missing = await handleSeoCheckRequest(post({ url: "https://example.com/" }), deps);
  assert.equal(missing.status, 400);
  const get = await handleSeoCheckRequest(new Request("https://www.nlstudio.io/api/seo-check"), deps);
  assert.equal(get.status, 405);
  const options = await handleSeoCheckRequest(new Request("https://www.nlstudio.io/api/seo-check", {
    method: "OPTIONS",
    headers: { origin: "https://www.nlstudio.io" },
  }), deps);
  assert.equal(options.status, 204);
  assert.equal(options.headers.get("access-control-allow-origin"), "https://www.nlstudio.io");
  assert.equal(transport.calls.length, 0);

  const huge = await handleSeoCheckRequest(post("x".repeat(20_000), { "content-length": "20000" }), deps);
  assert.equal(huge.status, 400);
});

test("client address prefers x-real-ip", () => {
  const request = new Request("https://www.nlstudio.io/api/seo-check", {
    headers: { "x-real-ip": "198.51.100.8", "x-forwarded-for": "10.0.0.8, 198.51.100.9" },
  });
  assert.equal(clientAddress(request), "198.51.100.8");
  const forwarded = new Request("https://www.nlstudio.io/api/seo-check", {
    headers: { "x-forwarded-for": "198.51.100.9, 10.1.1.1" },
  });
  assert.equal(clientAddress(forwarded), "198.51.100.9");
  assert.equal(clientAddress(new Request("https://www.nlstudio.io/api/seo-check")), "unknown");
});

test("environment config overrides limits and appends exact origins", () => {
  const config = configFromEnv({
    SEO_CHECK_DAILY_CAP: "unlimited",
    SEO_CHECK_IP_LIMIT: "8",
    SEO_CHECK_ALLOWED_ORIGINS: "https://preview.example, not a origin",
    VERCEL_ENV: "production",
    SEO_CHECK_TIMEOUT_MS: "nope",
  });
  assert.equal(config.dailyCap, null);
  assert.equal(config.ipNewScanLimit, 8);
  assert.equal(config.timeoutMs, 12_000);
  assert.equal(config.allowedOrigins.includes("https://preview.example"), true);
  assert.equal(config.allowedOrigins.includes("https://www.nlstudio.io"), true);
  assert.equal(config.allowedOrigins.includes("http://localhost:3000"), false);

  const dev = configFromEnv({ VERCEL_ENV: "development" });
  assert.equal(dev.allowedOrigins.includes("http://localhost:3000"), true);
});
