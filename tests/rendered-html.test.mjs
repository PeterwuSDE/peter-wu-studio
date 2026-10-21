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
  assert.match(html, /Northline Studio \| Design, Development &amp; Digital Systems/);
  assert.match(html, /aria-label="北境 logo"/);
  assert.match(html, /aria-controls="mobile-navigation"/);
  assert.doesNotMatch(html, /<details class="mobile-menu"/);
  assert.match(html, /northline-logo-north/);
  assert.match(html, /northline-logo-south/);
  assert.doesNotMatch(html, /↗/);
  assert.equal((html.match(/<h1>/g) ?? []).length, 1);
  assert.doesNotMatch(html, /class="intro-section|class="engagement-path/);
  assert.doesNotMatch(html, /id="work"|href="#work"|Selected concepts|CONCEPT PROJECT|Aster Atelier|Lucent House|Meridian One/);
  const servicesHtml = html.match(/<section class="services-section[\s\S]*?<section class="pricing-section/)?.[0] ?? "";
  assert.match(servicesHtml, /Four ways forward/);
  assert.equal((servicesHtml.match(/<article class="service">/g) ?? []).length, 4);
  assert.match(servicesHtml, /Websites &amp; Brand Presence/);
  assert.match(servicesHtml, />Commerce</);
  assert.match(servicesHtml, />Business Systems</);
  assert.match(servicesHtml, />Ongoing Care</);
  assert.match(servicesHtml, /Shopify/);
  assert.match(servicesHtml, /Booking &amp; scheduling/);
  const serviceCards = [...servicesHtml.matchAll(/<article class="service">([\s\S]*?)<\/article>/g)].map((match) => match[1]);
  assert.equal(serviceCards.length, 4);
  for (const card of serviceCards) {
    assert.equal((card.match(/<li>/g) ?? []).length, 3);
  }
  assert.doesNotMatch(servicesHtml, /Signature Websites|Portfolio Websites|Website Redesign|Business Tools &amp; Integrations/);
  assert.match(html, /<span class="contact-email">northlinestudio425@gmail\.com<\/span>/);
  assert.doesNotMatch(html, /mailto:|Start the conversation/);
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /hello@yourstudio\.com/);
  assert.doesNotMatch(html, /small business|small-business|local business/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);

  assert.match(html, /<h3>Direction<\/h3>/);
  assert.match(html, /<h3>Design<\/h3>/);
  assert.match(html, /<h3>Build<\/h3>/);
  assert.match(html, /<h3>Launch &amp; Care<\/h3>/);
  const faqHtml = html.match(/<section class="faq-section[\s\S]*?<section class="contact-section/)?.[0] ?? "";
  assert.equal((faqHtml.match(/<details>/g) ?? []).length, 3);

  const contactHtml = html.match(/<section class="contact-section[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.equal((contactHtml.match(/<li>/g) ?? []).length, 4);
});

test("renders pricing navigation and investment options", async () => {
  const response = await render();
  const html = await response.text();
  const pricingHtml = html.match(/<section class="pricing-section[\s\S]*?<section class="process-section/)?.[0] ?? "";

  assert.match(html, /href="#pricing"/);
  assert.match(html, /<section[^>]+id="pricing"/);
  assert.equal((pricingHtml.match(/<article class="pricing-card(?: pricing-card-featured)?">/g) ?? []).length, 4);
  assert.match(pricingHtml, /The Essential Website/);
  assert.match(pricingHtml, /Starting from \$1,500/);
  assert.match(pricingHtml, /The Signature Website/);
  assert.match(pricingHtml, /Starting from \$3,500/);
  assert.match(pricingHtml, /<h3>Commerce<\/h3>/);
  assert.match(pricingHtml, /<h3>Business Systems<\/h3>/);
  assert.equal((pricingHtml.match(/Custom proposal/g) ?? []).length, 2);
  assert.match(pricingHtml, /Starting from \$150\/month/);
  assert.doesNotMatch(pricingHtml, /Optional enhancements|Additional custom page|Priority production timeline/);
  assert.doesNotMatch(pricingHtml, /Business Tools &amp; Integrations/);
  assert.match(pricingHtml, /third-party[\s\S]{0,180}separately/i);

  const pricingCards = [...pricingHtml.matchAll(/<article class="pricing-card(?: pricing-card-featured)?">([\s\S]*?)<\/article>/g)].map((match) => match[1]);
  for (const title of ["Commerce", "Business Systems"]) {
    const card = pricingCards.find((candidate) => candidate.includes(`<h3>${title}</h3>`)) ?? "";
    assert.match(card, /Custom proposal/);
    assert.match(card, /tailored|scoped|proposal/i);
    assert.doesNotMatch(card, /up to \d+ products|included products|unlimited/i);
  }

  for (const card of pricingCards) {
    assert.equal((card.match(/<li>/g) ?? []).length, 4);
  }

  assert.equal((pricingHtml.match(/<div class="pricing-support">/g) ?? []).length, 1);
  assert.doesNotMatch(pricingHtml, /partnership-panel/);
});

test("ships project-specific metadata and assets", async () => {
  const [layout, packageJson, styles] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /og\.png/);
  assert.match(layout, /favicon\.png/);
  assert.match(layout, /Northline Studio \| Design, Development & Digital Systems/);
  assert.match(layout, /websites, commerce experiences, and digital systems/i);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(styles, /enhancements-panel/);
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/favicon.png", import.meta.url));
  await access(new URL("../public/northline-logo.svg", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});

test("keeps section navigation aligned without locking document scroll", async () => {
  const response = await render();
  const html = await response.text();
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  const hashTargets = new Set([...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]));

  for (const target of hashTargets) {
    assert.ok(ids.has(target), `missing section target #${target}`);
  }

  const [mobileMenu, sectionLink] = await Promise.all([
    readFile(new URL("../app/MobileMenu.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/SectionLink.tsx", import.meta.url), "utf8"),
  ]);

  for (const target of ["services", "pricing", "process", "about", "contact"]) {
    assert.equal((mobileMenu.match(new RegExp(`href: "#${target}"`, "g")) ?? []).length, 1);
  }

  assert.match(sectionLink, /querySelector\("\.site-header"\)/);
  assert.match(sectionLink, /window\.scrollTo/);
  assert.match(sectionLink, /window\.history\.pushState/);
  assert.doesNotMatch(sectionLink, /document\.(?:body|documentElement)\.style\.overflow/);
});
