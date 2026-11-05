import assert from "node:assert/strict";
import test from "node:test";
import { fetchPage } from "../../shared/seo-check/fetch-page.ts";
import type { DnsResolver, PageFetchResult, ResolvedAddress } from "../../shared/seo-check/fetch-page.ts";
import { htmlResult, scriptedConnector } from "./helpers.ts";

const config = {
  timeoutMs: 20,
  maxRedirects: 5,
  maxBytes: 100_000,
  maxRawBytes: 100_000,
  userAgent: "deadline-test",
};

// A broken fetch must fail the assertion instead of hanging the test process.
async function withinTestDeadline(pending: Promise<PageFetchResult>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      pending,
      new Promise<"still_pending">((resolve) => {
        timer = setTimeout(() => resolve("still_pending"), 200);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

test("never-settling DNS returns timeout without connecting", async () => {
  const transport = scriptedConnector(() => htmlResult("<html></html>"));
  const result = await withinTestDeadline(fetchPage({
    url: new URL("https://example.com/"),
    resolver: { lookup: () => new Promise(() => {}) },
    connector: transport.connector,
    config,
    now: Date.now,
  }));
  assert.deepEqual(result, { type: "timeout", redirectCount: 0 });
  assert.equal(transport.calls.length, 0);
});

for (const settlement of ["resolve", "reject"] as const) {
  test(`DNS ${settlement} after timeout cannot start a connection or reject the fetch`, async () => {
    let resolve!: (addresses: ResolvedAddress[]) => void;
    let reject!: (error: Error) => void;
    const lookup = new Promise<ResolvedAddress[]>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    const transport = scriptedConnector(() => htmlResult("<html></html>"));
    const pending = fetchPage({
      url: new URL("https://example.com/"),
      resolver: { lookup: () => lookup },
      connector: transport.connector,
      config,
      now: Date.now,
    });
    const result = await withinTestDeadline(pending);
    // Always release the DNS operation, even when verifying the unfixed behavior.
    if (settlement === "resolve") resolve([{ address: "1.1.1.1", family: 4 }]);
    else reject(new Error("late DNS failure"));
    await new Promise<void>((done) => setImmediate(done));
    assert.deepEqual(result, { type: "timeout", redirectCount: 0 });
    assert.deepEqual(await pending, { type: "timeout", redirectCount: 0 });
    assert.equal(transport.calls.length, 0);
  });
}

test("redirect DNS shares the original deadline and never connects after timeout", async () => {
  let lookupCount = 0;
  const resolver: DnsResolver = {
    async lookup() {
      lookupCount += 1;
      if (lookupCount === 1) return [{ address: "1.1.1.1", family: 4 }];
      return await new Promise(() => {});
    },
  };
  const transport = scriptedConnector(() => htmlResult("", 302, { location: "https://redirect.example/" }));
  const result = await withinTestDeadline(fetchPage({
    url: new URL("https://example.com/"),
    resolver,
    connector: transport.connector,
    config,
    now: Date.now,
  }));
  assert.deepEqual(result, { type: "timeout", redirectCount: 1 });
  assert.equal(lookupCount, 2);
  assert.equal(transport.calls.length, 1);
});

test("DNS failure before the deadline remains a DNS error", async () => {
  const transport = scriptedConnector(() => htmlResult("<html></html>"));
  const result = await fetchPage({
    url: new URL("https://example.com/"),
    resolver: { lookup: async () => { throw new Error("DNS failed"); } },
    connector: transport.connector,
    config,
    now: Date.now,
  });
  assert.deepEqual(result, { type: "dns", redirectCount: 0 });
  assert.equal(transport.calls.length, 0);
});

test("DNS before the deadline still validates all addresses and pins a public result", async () => {
  for (const addresses of [["1.1.1.1"], ["1.1.1.1", "127.0.0.1"]]) {
    const transport = scriptedConnector(() => htmlResult("<html></html>"));
    const result = await fetchPage({
      url: new URL("https://example.com/"),
      resolver: { lookup: async () => addresses.map((address) => ({ address, family: 4 as const })) },
      connector: transport.connector,
      config,
      now: Date.now,
    });
    if (addresses.length === 1) {
      assert.equal(result.type, "document");
      assert.equal(transport.calls.length, 1);
      assert.equal(transport.calls[0].pinned, "1.1.1.1");
    } else {
      assert.deepEqual(result, { type: "blocked", redirectCount: 0 });
      assert.equal(transport.calls.length, 0);
    }
  }
});
