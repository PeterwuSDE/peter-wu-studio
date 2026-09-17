import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the finished studio homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Northline Studio \| Design-Led Websites &amp; Digital Systems/);
  assert.match(html, /aria-label="北境 logo"/);
  assert.match(html, /aria-controls="mobile-navigation"/);
  assert.doesNotMatch(html, /<details class="mobile-menu"/);
  assert.match(html, /northline-logo-north/);
  assert.match(html, /northline-logo-south/);
  assert.doesNotMatch(html, /↗/);
  assert.match(html, /A digital studio for brands/);
  assert.match(html, /Selected concepts/);
  assert.match(html, /Sharp creative/);
  assert.match(html, /secure hosting/i);
  assert.match(html, /mailto:northlinestudio425@gmail\.com/);
  assert.doesNotMatch(html, /hello@yourstudio\.com/);
  assert.doesNotMatch(html, /small business|small-business|local business/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("ships project-specific metadata and assets", async () => {
  const [layout, page, packageJson] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /og\.png/);
  assert.match(layout, /favicon\.png/);
  assert.match(page, /CONCEPT PROJECT/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/favicon.png", import.meta.url));
  await access(new URL("../public/northline-logo.svg", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
