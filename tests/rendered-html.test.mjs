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
  const servicesHtml = html.match(/<section class="services-section[\s\S]*?<section class="pricing-section/)?.[0] ?? "";
  assert.match(servicesHtml, /Four ways forward/);
  assert.match(servicesHtml, /one accountable partner/i);
  assert.equal((servicesHtml.match(/<article class="service">/g) ?? []).length, 4);
  assert.match(servicesHtml, /Websites &amp; Brand Presence/);
  assert.match(servicesHtml, />Commerce</);
  assert.match(servicesHtml, />Business Systems</);
  assert.match(servicesHtml, />Ongoing Care</);
  assert.match(servicesHtml, /Shopify/);
  assert.match(servicesHtml, /Booking &amp; scheduling/);
  assert.doesNotMatch(servicesHtml, /Signature Websites|Portfolio Websites|Website Redesign|Business Tools &amp; Integrations/);
  assert.match(html, /secure hosting/i);
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
  assert.match(html, /design-led digital studio/i);
  assert.match(html, /website, store, or system/i);
  assert.match(html, /what you are building or operating/i);
  assert.match(html, /new build, an improvement, or ongoing management/i);
  assert.match(html, /websites, commerce, digital systems, and ongoing care/i);

  const faqHtml = html.match(/<section class="faq-section[\s\S]*?<section class="contact-section/)?.[0] ?? "";
  assert.equal((faqHtml.match(/<details>/g) ?? []).length, 5);
  assert.match(faqHtml, /third-party/i);
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
  assert.match(pricingHtml, /Ongoing Partnership/);
  assert.match(pricingHtml, /limited availability/i);
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

  const partnership = pricingHtml.match(/<article class="partnership-panel">([\s\S]*?)<\/article>/)?.[1] ?? "";
  assert.match(partnership, /Tailored engagement/);
  assert.match(partnership, /Limited availability/);
  assert.doesNotMatch(partnership, /\$\d/);
});

test("ships project-specific metadata and assets", async () => {
  const [layout, packageJson, styles] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /og\.png/);
  assert.match(layout, /favicon\.png/);
  assert.match(layout, /Northline Studio \| Design, Commerce & Digital Systems/);
  assert.match(layout, /websites, commerce experiences, and business systems/i);
  assert.match(layout, /designs, builds, launches, and manages/i);
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
