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
  assert.match(html, /Northline Studio \| Design, Commerce &amp; Digital Systems/);
  assert.match(html, /aria-label="北境 logo"/);
  assert.match(html, /aria-controls="mobile-navigation"/);
  assert.doesNotMatch(html, /<details class="mobile-menu"/);
  assert.match(html, /northline-logo-north/);
  assert.match(html, /northline-logo-south/);
  assert.doesNotMatch(html, /↗/);
  assert.match(html, /We build the digital side of ambitious businesses/);
  assert.match(html, /founders and owner-led businesses/i);
  assert.match(html, /Build something new/);
  assert.match(html, /Improve what already exists/);
  assert.match(html, /Let us manage it for you/);
  assert.equal((html.match(/<article class="engagement-path"/g) ?? []).length, 3);
  assert.doesNotMatch(html, /A digital studio for brands that need to look/);
  assert.doesNotMatch(html, /id="work"|href="#work"|Selected concepts|CONCEPT PROJECT|Aster Atelier|Lucent House|Meridian One/);
  assert.match(html, /Sharp creative/);
  assert.equal((html.match(/<article class="service">/g) ?? []).length, 5);
  assert.match(html, /Business Tools &amp; Integrations/);
  assert.match(html, /Booking &amp; scheduling/);
  assert.match(html, /secure hosting/i);
  assert.match(html, /<span class="contact-email">northlinestudio425@gmail\.com<\/span>/);
  assert.doesNotMatch(html, /mailto:|Start the conversation/);
  assert.doesNotMatch(html, /hello@yourstudio\.com/);
  assert.doesNotMatch(html, /small business|small-business|local business/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("renders pricing navigation and investment options", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /href="#pricing"/);
  assert.match(html, /<section[^>]+id="pricing"/);
  assert.match(html, /The Essential/);
  assert.match(html, /Starting from \$1,500/);
  assert.match(html, /The Signature/);
  assert.match(html, /Starting from \$3,500/);
  assert.match(html, /Business Tools &amp; Integrations/);
  assert.match(html, /Starting from \$150\/month/);
});

test("ships project-specific metadata and assets", async () => {
  const [layout, packageJson] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /og\.png/);
  assert.match(layout, /favicon\.png/);
  assert.match(layout, /Northline Studio \| Design, Commerce & Digital Systems/);
  assert.match(layout, /websites, commerce experiences, and business systems/i);
  assert.match(layout, /designs, builds, launches, and manages/i);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/favicon.png", import.meta.url));
  await access(new URL("../public/northline-logo.svg", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
