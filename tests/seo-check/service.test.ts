import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import test from "node:test";
import { NO_PRIORITY_FINDINGS_MESSAGE } from "../../shared/seo-check/contract.ts";
import { createFileStore, createMemoryStore } from "../../shared/seo-check/store.ts";
import { readStoredScan, runSeoCheck } from "../../shared/seo-check/service.ts";
import { assertNoScore, clock, htmlResult, pageHtml, publicResolver, requestId, scriptedConnector } from "./helpers.ts";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const START = Date.parse("2026-04-01T00:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function setup(html = pageHtml(), addresses: string[] | ((host: string, call: number) => string[]) = ["1.1.1.1"]) {
  const dns = publicResolver(addresses);
  const transport = scriptedConnector(() => htmlResult(html));
  const store = createMemoryStore();
  const time = clock(START);
  return { dns, transport, store, time };
}

async function scan(
  fixture: ReturnType<typeof setup>,
  url: string,
  extra: { locale?: string; requestId?: string; clientIp?: string; config?: Record<string, unknown> } = {},
) {
  return runSeoCheck(
    {
      url,
      locale: extra.locale,
      requestId: extra.requestId ?? requestId(1),
      clientIp: extra.clientIp ?? "203.0.113.10",
    },
    {
      store: fixture.store,
      resolver: fixture.dns.resolver,
      connector: fixture.transport.connector,
      now: fixture.time.now,
      config: extra.config,
    },
  );
}

test("a public homepage returns the completed contract and no score", async () => {
  const fixture = setup();
  const result = await scan(fixture, "https://example.com/shop", { locale: "zh" });
  assert.equal(result.httpStatus, 200);
  assert.equal(result.body.status, "completed");
  assert.equal(result.body.code, "no_priority_findings");
  assert.equal(result.body.message, NO_PRIORITY_FINDINGS_MESSAGE.zh);
  assert.equal(result.body.normalizedUrl, "https://example.com/shop");
  assert.equal(result.body.finalUrl, "https://example.com/shop");
  assert.equal(result.body.cached, false);
  assert.equal(result.body.locale, "zh");
  assert.equal(result.body.findings.length, 0);
  assert.equal(result.body.coverage.completed, 8);
  assert.equal(result.body.rules.length, 8);
  assert.match(result.body.scanId ?? "", /^scan_[A-Za-z0-9_-]{22}$/);
  assert.equal(result.body.checkedAt, "2026-04-01T00:00:00.000Z");
  assert.equal(fixture.transport.calls.length, 1);
  assert.equal(fixture.transport.calls[0]?.pinned, "1.1.1.1");
  assert.equal(fixture.transport.calls[0]?.headers.cookie, undefined);
  assert.equal(fixture.transport.calls[0]?.headers.authorization, undefined);
  assertNoScore(result.body);
  assert.equal(JSON.stringify(result.body).includes("northlinestudio425@gmail.com"), false);
});

test("cache keeps the original check time and isolates path plus rule version", async () => {
  const fixture = setup();
  const first = await scan(fixture, "https://example.com/shop/");
  fixture.time.advance(60_000);
  const second = await scan(fixture, "https://example.com/shop/#section", { requestId: requestId(2), locale: "zh" });
  assert.equal(second.body.cached, true);
  assert.equal(second.body.scanId, first.body.scanId);
  assert.equal(second.body.checkedAt, first.body.checkedAt);
  assert.equal(second.body.locale, "zh");
  assert.equal(second.body.message, NO_PRIORITY_FINDINGS_MESSAGE.zh);
  assert.equal(fixture.transport.calls.length, 1);

  await scan(fixture, "https://example.com/", { requestId: requestId(3) });
  assert.equal(fixture.transport.calls.length, 2);
  assert.equal(fixture.transport.calls[1]?.url, "https://example.com/");

  await scan(fixture, "https://example.com/shop/", { requestId: requestId(4), config: { ruleVersion: "homepage-test.2" } });
  assert.equal(fixture.transport.calls.length, 3);
  assert.equal(fixture.transport.calls[2]?.url, "https://example.com/shop/");
});

test("success cache expires after 24 hours and failures use a short cache", async () => {
  const fixture = setup();
  const first = await scan(fixture, "https://example.com/");
  fixture.time.advance(DAY);
  const second = await scan(fixture, "https://example.com/", { requestId: requestId(2) });
  assert.equal(second.body.cached, false);
  assert.notEqual(second.body.scanId, first.body.scanId);
  assert.equal(fixture.transport.calls.length, 2);

  const failing = setup();
  failing.transport = scriptedConnector(() => {
    throw Object.assign(new Error("aborted"), { name: "AbortError" });
  });
  const failed = await scan(failing, "https://example.com/down");
  assert.equal(failed.body.status, "unavailable");
  assert.equal(failed.body.code, "timeout");
  assert.match(failed.body.message, /could not be read just now/);
  assert.equal(failed.body.findings.length, 0);
  await scan(failing, "https://example.com/down", { requestId: requestId(2) });
  assert.equal(failing.transport.calls.length, 1);
  failing.time.advance(2 * 60 * 1000);
  await scan(failing, "https://example.com/down", { requestId: requestId(3) });
  assert.equal(failing.transport.calls.length, 2);
});

test("timeout budget can expire before a connection", async () => {
  const fixture = setup();
  const result = await scan(fixture, "https://example.com/", { config: { timeoutMs: 0 } });
  assert.equal(result.body.code, "timeout");
  assert.equal(fixture.transport.calls.length, 0);
  assert.equal(fixture.dns.seen.length, 0);
});

test("rate limits, daily cap, and the injected clock", async () => {
  const fixture = setup();
  for (let index = 1; index <= 5; index += 1) {
    const result = await scan(fixture, `https://example.com/p${index}`, { requestId: requestId(index) });
    assert.equal(result.httpStatus, 200, `scan ${index}`);
  }
  const blocked = await scan(fixture, "https://example.com/p6", { requestId: requestId(6) });
  assert.equal(blocked.httpStatus, 429);
  assert.equal(blocked.body.code, "ip_rate_limit");
  assert.equal(blocked.body.findings.length, 0);
  const cached = await scan(fixture, "https://example.com/p1", { requestId: requestId(7) });
  assert.equal(cached.body.cached, true);
  assert.equal(fixture.transport.calls.length, 5);

  fixture.time.advance(HOUR);
  const afterWindow = await scan(fixture, "https://example.com/p6", { requestId: requestId(8) });
  assert.equal(afterWindow.httpStatus, 200);
  assert.equal(fixture.transport.calls.length, 6);

  const capped = setup();
  await scan(capped, "https://example.com/a", { requestId: requestId(1), config: { dailyCap: 2 } });
  await scan(capped, "https://example.com/b", { requestId: requestId(2), config: { dailyCap: 2 } });
  const third = await scan(capped, "https://example.com/c", { requestId: requestId(3), config: { dailyCap: 2 } });
  assert.equal(third.body.code, "daily_cap");
  const stillCached = await scan(capped, "https://example.com/a", { requestId: requestId(4), config: { dailyCap: 2 } });
  assert.equal(stillCached.body.cached, true);
  assert.equal(capped.transport.calls.length, 2);
});

test("the wider cache-hit limit can still return 429", async () => {
  const fixture = setup();
  await scan(fixture, "https://example.com/", { config: { ipCacheHitLimit: 1 } });
  const hit = await scan(fixture, "https://example.com/", { requestId: requestId(2), config: { ipCacheHitLimit: 1 } });
  assert.equal(hit.body.cached, true);
  const over = await scan(fixture, "https://example.com/", { requestId: requestId(3), config: { ipCacheHitLimit: 1 } });
  assert.equal(over.httpStatus, 429);
  assert.equal(fixture.transport.calls.length, 1);
});

test("redirects stay on the submitted path and stop after three", async () => {
  const dns = publicResolver();
  const transport = scriptedConnector((input) => {
    if (input.target.pathname === "/shop") {
      return { status: 302, headers: { location: "/shop/" }, body: new Uint8Array(), truncated: false };
    }
    return htmlResult(pageHtml(), 200);
  });
  const store = createMemoryStore();
  const time = clock(START);
  const moved = await runSeoCheck(
    { url: "https://example.com/shop", locale: "en", requestId: requestId(1), clientIp: "203.0.113.10" },
    { store, resolver: dns.resolver, connector: transport.connector, now: time.now },
  );
  assert.equal(moved.body.finalUrl, "https://example.com/shop/");
  assert.equal(moved.body.normalizedUrl, "https://example.com/shop");
  assert.equal(moved.body.redirectCount, 1);
  assert.notEqual(moved.body.finalUrl, "https://example.com/");

  const looping = scriptedConnector((input) => ({
    status: 302,
    headers: { location: `${input.target.pathname}-next` },
    body: new Uint8Array(),
    truncated: false,
  }));
  const tooMany = await runSeoCheck(
    { url: "https://example.com/start", locale: "en", requestId: requestId(2), clientIp: "203.0.113.11" },
    { store: createMemoryStore(), resolver: dns.resolver, connector: looping.connector, now: time.now },
  );
  assert.equal(tooMany.body.code, "too_many_redirects");
  assert.equal(tooMany.body.findings.length, 0);
  assert.equal(looping.calls.length, 4);
});

test("private redirects, credentials, ports, and DNS answers never open a private connection", async () => {
  const dns = publicResolver((host) => (host === "rebind.example" ? ["10.0.0.5"] : ["1.1.1.1"]));
  const transport = scriptedConnector((input) => {
    if (input.target.pathname === "/jump") {
      return { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" }, body: new Uint8Array(), truncated: false };
    }
    return htmlResult(pageHtml());
  });
  const time = clock(START);
  const redirect = await runSeoCheck(
    { url: "https://example.com/jump", locale: "en", requestId: requestId(1), clientIp: "203.0.113.12" },
    { store: createMemoryStore(), resolver: dns.resolver, connector: transport.connector, now: time.now },
  );
  assert.equal(redirect.httpStatus, 400);
  assert.equal(redirect.body.code, "blocked_target");
  assert.equal(redirect.body.findings.length, 0);
  assert.equal(JSON.stringify(redirect.body).includes("169.254.169.254"), false);
  assert.equal(transport.calls.length, 1);

  const secret = await runSeoCheck(
    { url: "https://user:s3cret@example.com/shop", locale: "en", requestId: requestId(2), clientIp: "203.0.113.12" },
    { store: createMemoryStore(), resolver: dns.resolver, connector: transport.connector, now: time.now },
  );
  assert.equal(secret.body.code, "blocked_target");
  assert.equal(JSON.stringify(secret.body).includes("s3cret"), false);
  assert.equal(transport.calls.some((call) => call.url.includes("s3cret")), false);

  const port = await runSeoCheck(
    { url: "https://example.com:8443/", locale: "en", requestId: requestId(3), clientIp: "203.0.113.12" },
    { store: createMemoryStore(), resolver: dns.resolver, connector: transport.connector, now: time.now },
  );
  assert.equal(port.httpStatus, 400);
  assert.equal(port.body.code, "blocked_target");

  const mapped = await runSeoCheck(
    { url: "http://[::ffff:169.254.169.254]/", locale: "en", requestId: requestId(4), clientIp: "203.0.113.12" },
    { store: createMemoryStore(), resolver: dns.resolver, connector: transport.connector, now: time.now },
  );
  assert.equal(mapped.body.code, "blocked_target");

  const rebind = publicResolver((host, call) => {
    if (host === "rebind.example" && call > 1) return ["127.0.0.1"];
    return ["1.1.1.1"];
  });
  const rebindTransport = scriptedConnector((input) => {
    if (input.target.pathname === "/once") {
      return { status: 302, headers: { location: "https://rebind.example/secret" }, body: new Uint8Array(), truncated: false };
    }
    return htmlResult(pageHtml());
  });
  const rebound = await runSeoCheck(
    { url: "https://example.com/once", locale: "en", requestId: requestId(5), clientIp: "203.0.113.13" },
    { store: createMemoryStore(), resolver: rebind.resolver, connector: rebindTransport.connector, now: time.now },
  );
  assert.equal(rebound.body.code, "blocked_target");
  assert.deepEqual(rebindTransport.calls.map((call) => call.pinned), ["1.1.1.1"]);
  assert.equal(JSON.stringify(rebound.body).includes("127.0.0.1"), false);

  const mixed = publicResolver(["1.1.1.1", "10.1.0.5"]);
  const mixedTransport = scriptedConnector(() => htmlResult(pageHtml()));
  const mixedResult = await runSeoCheck(
    { url: "https://example.com/mixed", locale: "en", requestId: requestId(6), clientIp: "203.0.113.14" },
    { store: createMemoryStore(), resolver: mixed.resolver, connector: mixedTransport.connector, now: time.now },
  );
  assert.equal(mixedResult.body.code, "blocked_target");
  assert.equal(mixedTransport.calls.length, 0);

  const v6 = publicResolver(["2606:4700:4700::1111"]);
  const v6transport = scriptedConnector(() => htmlResult(pageHtml()));
  const v6result = await runSeoCheck(
    { url: "https://example.com/v6", locale: "en", requestId: requestId(7), clientIp: "203.0.113.15" },
    { store: createMemoryStore(), resolver: v6.resolver, connector: v6transport.connector, now: time.now },
  );
  assert.equal(v6result.httpStatus, 200);
  assert.equal(v6transport.calls[0]?.pinned, "2606:4700:4700::1111");
  assert.equal(v6transport.calls[0]?.family, 6);
});

test("same-hop DNS rebinding cannot replace the pinned address", async () => {
  let lookups = 0;
  const dns = publicResolver(() => {
    lookups += 1;
    return lookups === 1 ? ["1.1.1.1"] : ["127.0.0.1"];
  });
  const transport = scriptedConnector(() => htmlResult(pageHtml()));
  const result = await runSeoCheck(
    { url: "https://example.com/", locale: "en", requestId: requestId(1), clientIp: "203.0.113.16" },
    { store: createMemoryStore(), resolver: dns.resolver, connector: transport.connector, now: clock(START).now },
  );
  assert.equal(result.httpStatus, 200);
  assert.equal(dns.seen.length, 1);
  assert.equal(transport.calls[0]?.pinned, "1.1.1.1");
});

test("access limits, oversized bodies, and non-HTML are not scored as SEO failures", async () => {
  const cases = [
    { status: 403, code: "access_restricted" },
    { status: 429, code: "access_restricted" },
  ];
  for (const item of cases) {
    const transport = scriptedConnector(() => htmlResult(pageHtml({ title: "", head: "", body: "<p>blocked</p>" }), item.status));
    const result = await runSeoCheck(
      { url: "https://example.com/", locale: "zh", requestId: requestId(item.status), clientIp: `203.0.113.${item.status}` },
      { store: createMemoryStore(), resolver: publicResolver().resolver, connector: transport.connector, now: clock(START).now },
    );
    assert.equal(result.body.code, item.code);
    assert.equal(result.body.rules.length, 0);
    assert.equal(result.body.findings.length, 0);
    assert.match(result.body.message, /该页面限制了本次访问/);
  }

  const challenge = scriptedConnector(() => htmlResult("<title>Just a moment...</title><script src=\"/cdn-cgi/challenge-platform/orchestrate.js\"></script>"));
  const challenged = await runSeoCheck(
    { url: "https://example.com/challenge", locale: "zh", requestId: requestId(20), clientIp: "203.0.113.21" },
    { store: createMemoryStore(), resolver: publicResolver().resolver, connector: challenge.connector, now: clock(START).now },
  );
  assert.equal(challenged.body.code, "access_restricted");
  assert.equal(challenged.body.findings.length, 0);

  const huge = scriptedConnector(() => htmlResult("<title></title>", 200, { "content-length": "200" }));
  const tooBig = await runSeoCheck(
    { url: "https://example.com/huge", locale: "en", requestId: requestId(21), clientIp: "203.0.113.22" },
    { store: createMemoryStore(), resolver: publicResolver().resolver, connector: huge.connector, now: clock(START).now, config: { maxBytes: 100 } },
  );
  assert.equal(tooBig.body.status, "too_large");
  assert.equal(tooBig.body.findings.length, 0);
  assert.equal(tooBig.body.rules.find((item) => item.ruleId === "title")?.status, "unknown");
  assert.equal(tooBig.body.rules.find((item) => item.ruleId === "https")?.signal, "https");

  const pdf = scriptedConnector(() => ({
    status: 200,
    headers: { "content-type": "application/pdf", "x-robots-tag": "noindex" },
    body: new TextEncoder().encode("%PDF"),
    truncated: false,
  }));
  const file = await runSeoCheck(
    { url: "https://example.com/file.pdf", locale: "en", requestId: requestId(22), clientIp: "203.0.113.23" },
    { store: createMemoryStore(), resolver: publicResolver().resolver, connector: pdf.connector, now: clock(START).now },
  );
  assert.equal(file.body.status, "unsupported_content");
  assert.equal(file.body.rules.find((item) => item.ruleId === "indexability")?.signal, "noindex");
  assert.equal(file.body.findings.map((item) => item.ruleId).includes("title"), false);
});

test("gzip bodies are decoded and full HTML is not stored", async () => {
  const marker = `UNIQUE_BODY_MARKER_SHOULD_NOT_BE_STORED_IN_FULL_${"x".repeat(300)}`;
  const html = pageHtml({ body: `<h1>Fresh bread</h1><p>${marker}</p>` });
  const transport = scriptedConnector(() => ({
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "content-encoding": "gzip" },
    body: gzipSync(Buffer.from(html)),
    truncated: false,
  }));
  const store = createMemoryStore();
  const result = await runSeoCheck(
    { url: "https://example.com/", locale: "en", requestId: requestId(1), clientIp: "203.0.113.24" },
    { store, resolver: publicResolver().resolver, connector: transport.connector, now: clock(START).now },
  );
  assert.equal(result.body.status, "completed");
  assert.equal(result.body.rules.find((item) => item.ruleId === "title")?.signal, "present");
  const stored = JSON.stringify(await store.listScans());
  assert.equal(stored.includes(marker), false);
  assert.equal(stored.includes("<html"), false);
});

test("findings carry url, time, rule version, and at most two suggestions", async () => {
  const transport = scriptedConnector(() => htmlResult(pageHtml({
    title: "React App",
    head: '<meta name="robots" content="noindex">',
    body: "<h1>One</h1>",
  }), 200));
  const result = await runSeoCheck(
    { url: "http://example.com/shop", locale: "zh", requestId: requestId(1), clientIp: "203.0.113.25" },
    { store: createMemoryStore(), resolver: publicResolver().resolver, connector: transport.connector, now: clock(START).now },
  );
  assert.equal(result.body.findings.length <= 2, true);
  assert.ok(result.body.findings.length >= 1);
  for (const finding of result.body.findings) {
    assert.equal(finding.url, "http://example.com/shop");
    assert.equal(finding.checkedAt, result.body.checkedAt);
    assert.equal(finding.ruleVersion, result.body.ruleVersion);
    assert.equal(finding.suggestions.length >= 1 && finding.suggestions.length <= 2, true);
    assert.ok(finding.evidence.length > 0);
    assert.ok(finding.condition.length > 0);
  }
  assert.equal(result.body.findings[0]?.ruleId, "indexability");
  assert.match(result.body.findings[0]?.condition ?? "", /若希望此首页被收录/);
});

test("the same request id cannot be reused for another URL", async () => {
  const fixture = setup();
  await scan(fixture, "https://example.com/a");
  const conflict = await scan(fixture, "https://example.com/b");
  assert.equal(conflict.httpStatus, 409);
  assert.equal(conflict.body.code, "request_id_conflict");
  assert.equal(fixture.transport.calls.length, 1);
});

test("concurrent checks share one fetch", async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const transport = scriptedConnector(async () => {
    await gate;
    return htmlResult(pageHtml());
  });
  const store = createMemoryStore();
  const deps = {
    store,
    resolver: publicResolver().resolver,
    connector: transport.connector,
    now: () => START,
  };
  const first = runSeoCheck({ url: "https://example.com/", locale: "en", requestId: requestId(1), clientIp: "203.0.113.30" }, deps);
  const second = runSeoCheck({ url: "https://example.com/", locale: "zh", requestId: requestId(2), clientIp: "203.0.113.30" }, deps);
  await new Promise((resolve) => setTimeout(resolve, 20));
  release();
  const [left, right] = await Promise.all([first, second]);
  assert.equal(transport.calls.length, 1);
  assert.equal(left.body.scanId, right.body.scanId);
  assert.equal(left.body.cached || right.body.cached, true);
  assert.equal(left.body.checkedAt, right.body.checkedAt);
});

test("stored scans remain readable until retention, then disappear", async () => {
  const fixture = setup();
  const result = await scan(fixture, "https://example.com/");
  const scanId = result.body.scanId ?? "";
  fixture.time.advance(DAY + 1);
  const expiredCache = await scan(fixture, "https://example.com/", { requestId: requestId(2) });
  assert.equal(expiredCache.body.cached, false);
  const old = await readStoredScan(scanId, "en", { store: fixture.store, now: fixture.time.now });
  assert.ok(old);
  assert.equal(old?.checkedAt, result.body.checkedAt);
  assert.equal(old?.cached, false);
  assert.equal(old?.findings.length, 0);
  fixture.time.advance(7 * DAY);
  const gone = await readStoredScan(scanId, "zh", { store: fixture.store, now: fixture.time.now });
  assert.equal(gone, null);
});

test("a file store reloads a fresh cache without another fetch", async () => {
  const dir = await mkdtemp(join(tmpdir(), "seo-check-"));
  const filePath = join(dir, "store.json");
  try {
    const dns = publicResolver();
    const transport = scriptedConnector(() => htmlResult(pageHtml()));
    const time = clock(START);
    const firstStore = createFileStore(filePath);
    await runSeoCheck(
      { url: "https://example.com/shop/", locale: "en", requestId: requestId(1), clientIp: "203.0.113.40" },
      { store: firstStore, resolver: dns.resolver, connector: transport.connector, now: time.now },
    );
    const secondStore = createFileStore(filePath);
    const again = await runSeoCheck(
      { url: "https://example.com/shop/", locale: "en", requestId: requestId(2), clientIp: "203.0.113.40" },
      { store: secondStore, resolver: dns.resolver, connector: transport.connector, now: time.now },
    );
    assert.equal(again.body.cached, true);
    assert.equal(transport.calls.length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
