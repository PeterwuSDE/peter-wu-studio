import assert from "node:assert/strict";
import test from "node:test";
import { createProductionDeps } from "../lib/seo/production.ts";

test("Vercel cannot acknowledge inquiries using a local memory or file override", async () => {
  for (const override of [
    { SEO_INQUIRY_STORE: "memory" },
    { SEO_INQUIRY_STORE_PATH: "/tmp/ephemeral-inquiries.json" },
  ]) {
    const deps = await createProductionDeps({ VERCEL: "1", ...override });
    assert.equal(deps.store, null);
  }
});

test("local development can explicitly select the memory inquiry store", async () => {
  const deps = await createProductionDeps({ NODE_ENV: "development", SEO_INQUIRY_STORE: "memory" });
  assert.ok(deps.store);
});
