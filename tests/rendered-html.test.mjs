import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

let renderCount = 0;

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${++renderCount}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
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
  assert.match(pricingHtml, /Starting from \$2,500/);
  assert.doesNotMatch(pricingHtml, /Starting from \$1,500/);
  assert.match(pricingHtml, /Up to 3 custom-designed pages/);
  assert.match(pricingHtml, /The Signature Website/);
  assert.match(pricingHtml, /Starting from \$3,500/);
  assert.match(pricingHtml, /Up to 7 custom-designed pages/);
  assert.match(pricingHtml, /<h3>Commerce<\/h3>/);
  assert.match(pricingHtml, /<h3>Business Systems<\/h3>/);
  assert.equal((pricingHtml.match(/Custom proposal/g) ?? []).length, 2);
  assert.doesNotMatch(pricingHtml, /\$150\/month/);
  assert.doesNotMatch(pricingHtml, /agreed content support/);
  assert.match(pricingHtml, /<h3>Care<\/h3>/);
  assert.match(pricingHtml, /Starting from \$199\/month/);
  assert.match(pricingHtml, /Up to 1 hour of small content changes per month/);
  assert.match(pricingHtml, /<h3>Care Plus<\/h3>/);
  assert.match(pricingHtml, /Starting from \$399\/month/);
  assert.match(pricingHtml, /Up to 3 hours of changes per month/);
  assert.match(pricingHtml, /Priority response/);
  assert.match(pricingHtml, /Monthly site report/);
  assert.match(pricingHtml, /Additional work is billed at \$125\/hour/);
  assert.match(pricingHtml, /Unused hours do not roll over/);
  assert.match(pricingHtml, /3-month minimum term/);
  assert.match(pricingHtml, /Tailored ongoing partnerships are available for select clients who need regular design and development capacity/);
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
  assert.equal((pricingHtml.match(/<article class="care-tier">/g) ?? []).length, 2);
  assert.doesNotMatch(pricingHtml, /partnership-panel/);
  assert.doesNotMatch(html, /agreed content support/);
});

test("ships project-specific metadata and assets", async () => {
  const [layout, site, packageJson, styles] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/site.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /og\.png/);
  assert.match(layout, /favicon\.png/);
  assert.match(layout, /Northline Studio \| Design, Development & Digital Systems/);
  assert.match(layout, /websites, commerce experiences, and digital systems/i);
  assert.match(layout, /metadataBase: new URL\(siteOrigin\)/);
  assert.match(layout, /canonical: "\/"/);
  assert.match(site, /https:\/\/www\.nlstudio\.io/);
  assert.doesNotMatch(layout, /github\.io|peter-wu-studio/);
  assert.doesNotMatch(site, /github\.io/);
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

test("publishes the production canonical, share images, and studio structured data", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /<link rel="canonical" href="https:\/\/www\.nlstudio\.io\/"\/>/);
  assert.match(html, /property="og:url" content="https:\/\/www\.nlstudio\.io\/"/);
  assert.match(html, /property="og:image" content="https:\/\/www\.nlstudio\.io\/og\.png"/);
  assert.match(html, /property="og:image:width" content="1658"/);
  assert.match(html, /property="og:image:height" content="949"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /name="twitter:image" content="https:\/\/www\.nlstudio\.io\/og\.png"/);
  assert.match(html, /rel="icon" href="https:\/\/www\.nlstudio\.io\/favicon\.png"/);
  assert.match(html, /rel="apple-touch-icon" href="https:\/\/www\.nlstudio\.io\/favicon\.png"/);
  assert.doesNotMatch(html, /github\.io|peter-wu-studio/);

  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(jsonLd, "missing JSON-LD");
  const data = JSON.parse(jsonLd);
  assert.equal(data["@context"], "https://schema.org");
  assert.equal(data["@type"], "ProfessionalService");
  assert.equal(data.name, "Northline Studio");
  assert.equal(data.url, "https://www.nlstudio.io/");
  assert.equal(data.email, "northlinestudio425@gmail.com");
  assert.equal(data.logo.url, "https://www.nlstudio.io/favicon.png");
  assert.equal(data.image.url, "https://www.nlstudio.io/og.png");
  const serialized = JSON.stringify(data);
  for (const name of [
    "Websites & Brand Presence",
    "Commerce",
    "Business Systems",
    "Ongoing Care",
    "The Essential Website",
    "The Signature Website",
    "Care Plus",
    "Starting from $2,500",
    "Starting from $199/month",
    "Custom proposal",
  ]) {
    assert.match(serialized, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(serialized, /streetAddress|addressLocality|postalCode|telephone|aggregateRating|"review"/i);
});

test("serves robots.txt and sitemap.xml for the production host", async () => {
  const robots = await render("/robots.txt");
  assert.equal(robots.status, 200);
  assert.match(robots.headers.get("content-type") ?? "", /text\/plain/i);
  const robotsText = await robots.text();
  assert.match(robotsText, /User-Agent:\s*\*/);
  assert.match(robotsText, /Allow:\s*\//);
  assert.match(robotsText, /Sitemap:\s*https:\/\/www\.nlstudio\.io\/sitemap\.xml/);
  assert.doesNotMatch(robotsText, /github\.io/);

  const sitemap = await render("/sitemap.xml");
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers.get("content-type") ?? "", /xml/i);
  const xml = await sitemap.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(locs, ["https://www.nlstudio.io/"]);
  assert.doesNotMatch(xml, /github\.io|mac-mini/);

  const [exportedRobots, exportedSitemap, exportedHtml] = await Promise.all([
    readFile(new URL("../dist/client/robots.txt", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/sitemap.xml", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/index.html", import.meta.url), "utf8"),
  ]);
  assert.match(exportedRobots, /Sitemap:\s*https:\/\/www\.nlstudio\.io\/sitemap\.xml/);
  assert.match(exportedSitemap, /<loc>https:\/\/www\.nlstudio\.io\/<\/loc>/);
  assert.match(exportedHtml, /rel="canonical" href="https:\/\/www\.nlstudio\.io\/"/);
  assert.match(exportedHtml, /property="og:image" content="https:\/\/www\.nlstudio\.io\/og\.png"/);
  assert.match(exportedHtml, /type="application\/ld\+json"/);
  assert.doesNotMatch(exportedHtml, /github\.io/);
});

test("permanently redirects /mac-mini to the homepage", async () => {
  const response = await render("/mac-mini");
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "/");

  const slashed = await render("/mac-mini/");
  assert.equal(slashed.status, 308);
  assert.ok(["/", "/mac-mini"].includes(slashed.headers.get("location")));

  const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  for (const source of ["/mac-mini", "/mac-mini/"]) {
    const rule = vercel.redirects.find((entry) => entry.source === source);
    assert.ok(rule, `missing Vercel redirect for ${source}`);
    assert.equal(rule.destination, "/");
    assert.equal(rule.permanent, true);
  }
});

test("points the legacy GitHub Pages output at the production origin", async () => {
  const html = await readFile(new URL("../github-pages/index.html", import.meta.url), "utf8");
  const workflow = await readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");

  assert.match(html, /rel="canonical" href="https:\/\/www\.nlstudio\.io\/"/);
  assert.match(html, /http-equiv="refresh" content="0; url=https:\/\/www\.nlstudio\.io\/"/);
  assert.match(html, /location\.replace\("https:\/\/www\.nlstudio\.io\/"/);
  assert.doesNotMatch(workflow, /export:static|GITHUB_PAGES_BASE|npm run build/);
  assert.match(workflow, /path: github-pages/);
});
