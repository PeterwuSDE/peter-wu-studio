import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { classifyTransportError } from "../../shared/seo-check/fetch-page.ts";
import { createNodeConnector, createPinnedLookup } from "../../shared/seo-check/node-transport.ts";

test("pinned lookup returns only the validated address", async () => {
  const lookup = createPinnedLookup("example.com", "1.1.1.1", 4);
  const single = await new Promise<{ address: string; family: number }>((resolve, reject) => {
    lookup("example.com", {}, (error, address, family) => {
      if (error || typeof address !== "string" || family == null) reject(error ?? new Error("missing address"));
      else resolve({ address, family });
    });
  });
  assert.deepEqual(single, { address: "1.1.1.1", family: 4 });

  const all = await new Promise<{ address: string; family: number }[]>((resolve, reject) => {
    lookup("Example.com", { all: true }, (error, address) => {
      if (error || !Array.isArray(address)) reject(error ?? new Error("missing list"));
      else resolve(address);
    });
  });
  assert.deepEqual(all, [{ address: "1.1.1.1", family: 4 }]);

  await assert.rejects(new Promise((_resolve, reject) => {
    lookup("other.example", {}, (error) => reject(error ?? new Error("expected refusal")));
  }));
  await assert.rejects(new Promise((_resolve, reject) => {
    createPinnedLookup("example.com", "127.0.0.1", 4)("example.com", {}, (error) => reject(error ?? new Error("expected refusal")));
  }));
});

test("the connector refuses a loopback pin before connecting", async () => {
  let hits = 0;
  const server = createServer((_req, res) => {
    hits += 1;
    res.end("nope");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  try {
    await assert.rejects(createNodeConnector().request({
      target: new URL(`http://127.0.0.1:${port}/secret`),
      pinnedAddress: "127.0.0.1",
      pinnedFamily: 4,
      headers: { host: `127.0.0.1:${port}` },
      signal: AbortSignal.timeout(1000),
      maxRawBytes: 1024,
    }));
    assert.equal(hits, 0);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("transport errors map to timeout, tls, and dns", () => {
  assert.equal(classifyTransportError(Object.assign(new Error("aborted"), { name: "AbortError" })), "timeout");
  assert.equal(classifyTransportError(Object.assign(new Error("cert"), { code: "CERT_HAS_EXPIRED" })), "tls");
  assert.equal(classifyTransportError(Object.assign(new Error("dns"), { code: "ENOTFOUND" })), "dns");
  assert.equal(classifyTransportError(Object.assign(new Error("refused"), { code: "ECONNREFUSED" })), "network");
});
