import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";

let renderCount = 0;

const pages = [
  {
    path: "/",
    file: "index.html",
    canonical: "https://www.nlstudio.io/",
    title: "Northline Studio | Web Design, SEO, Care",
    description: "Northline Studio web design for people building something of their own, plus search optimization and ongoing site care.",
  },
  {
    path: "/websites",
    file: "websites/index.html",
    canonical: "https://www.nlstudio.io/websites",
    title: "Website Design and Builds | Northline Studio",
    description: "Content sites, Shopify storefronts, and redesigns by Northline Studio. Essential websites from $2,500. Signature websites from $3,500.",
  },
  {
    path: "/tools",
    file: "tools/index.html",
    canonical: "https://www.nlstudio.io/tools",
    title: "Business Tools & Workflow Systems | Northline Studio",
    description: "Booking, scheduling, client intake, and practical internal tools. Northline Studio builds business systems around the way you work.",
  },
  {
    path: "/shopify",
    file: "shopify/index.html",
    canonical: "https://www.nlstudio.io/shopify",
    title: "Shopify Stores & Commerce | Northline Studio",
    description: "New Shopify stores and storefront redesigns, with considered product pages, collections, integrations, and launch support from Northline Studio.",
  },
  {
    path: "/seo",
    file: "seo/index.html",
    canonical: "https://www.nlstudio.io/seo",
    title: "Search Optimization | Northline Studio",
    description: "An SEO health check, a 90-day launch, and monthly search work from Northline Studio, including Google Maps and AI assistants. Request a quote.",
  },
  {
    path: "/care",
    file: "care/index.html",
    canonical: "https://www.nlstudio.io/care",
    title: "Website Care Plans | Northline Studio",
    description: "Northline Studio Care from $199/month and Care Plus from $399/month, with hosting, monitoring, updates, and content changes.",
  },
  {
    path: "/contact",
    file: "contact/index.html",
    canonical: "https://www.nlstudio.io/contact",
    title: "Contact Northline Studio",
    description: "Email northlinestudio425@gmail.com about a website, search work, or ongoing care. An early idea is enough to start.",
  },
];

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

function decode(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function meta(html, attr, key) {
  const pattern = new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`, "i");
  return html.match(pattern)?.[1] ?? "";
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
}

function visibleHtml(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

async function pageHtml(pathname) {
  const response = await render(pathname);
  assert.equal(response.status, 200, pathname);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  return response.text();
}

test("offers four distinct services and a separate ongoing-care path", async () => {
  const html = await pageHtml("/");
  assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
  const visible = visibleHtml(html);
  assert.match(visible, /Built to stand out\./);
  assert.match(visible, /Made to work\./);
  assert.match(visible, /Thoughtful websites, Shopify stores, and practical business tools/);
  for (const label of ["Explore websites", "Explore business tools", "Explore Shopify", "Explore SEO", "Explore ongoing care"]) {
    assert.match(visible, new RegExp(label));
  }
  assert.match(visible, /Interface studies illustrate our approach; they are not client case studies/);
  assert.match(html, /href="\/websites"/);
  assert.match(html, /href="\/seo"/);
  assert.match(html, /href="\/tools"/);
  assert.match(html, /href="\/shopify"/);
  assert.match(html, /href="\/care"/);
  assert.doesNotMatch(html, /<img\b/);
  assert.doesNotMatch(html, /id="work"|href="#work"|Selected concepts|CONCEPT PROJECT|Aster Atelier|Lucent House|Meridian One/);
  assert.doesNotMatch(html, /class="intro-section|class="engagement-path/);
  assert.doesNotMatch(visibleHtml(html), /Starting from \$2,500|Starting from \$199/);
});

test("gives tools and Shopify separate, honest service destinations", async () => {
  for (const pathname of ["/tools", "/shopify"]) {
    const visible = visibleHtml(await pageHtml(pathname));
    assert.match(visible, /Custom proposal/);
    assert.match(visible, /Illustrative/);
    assert.match(visible, /third-party/i);
    assert.doesNotMatch(visible, /aggregateRating|guaranteed|unlimited/i);
  }
  const tools = visibleHtml(await pageHtml("/tools"));
  assert.match(tools, /Booking and scheduling/);
  assert.match(tools, /Workflow automation/);
  const shopify = visibleHtml(await pageHtml("/shopify"));
  assert.match(shopify, /Product and collection pages/);
  assert.match(shopify, /Payments and subscriptions/);
});

test("publishes website builds, packages, and business systems", async () => {
  const html = await pageHtml("/websites");
  const visible = visibleHtml(html);
  assert.match(html, /<h1>Website design and builds\.<\/h1>/);
  assert.match(visible, /content-only sites, Shopify storefronts, and redesigns/);
  assert.match(visible, /Wix or Squarespace/);
  assert.match(visible, /slow or outdated/);
  assert.match(visible, /The Essential Website/);
  assert.match(visible, /Starting from \$2,500/);
  assert.doesNotMatch(visible, /Starting from \$1,500/);
  assert.match(visible, /Up to 3 custom-designed pages/);
  assert.match(visible, /The Signature Website/);
  assert.match(visible, /Starting from \$3,500/);
  assert.match(visible, /Up to 7 custom-designed pages/);
  assert.match(visible, /Custom proposal/);
  assert.match(visible, /Store setup or redesign/);
  assert.match(visible, /Payments and subscriptions/);
  assert.match(visible, /<h2>Business Systems<\/h2>/);
  assert.match(visible, /Booking &amp; scheduling/);
  assert.match(visible, /CRM &amp; automation/);
  assert.match(visible, /Multi-tool suites/);
  assert.match(visible, /Booking and client intake/);
  assert.match(visible, /Practical digital systems/);
  assert.match(visible, /<h3>Direction<\/h3>/);
  assert.match(visible, /<h3>Design<\/h3>/);
  assert.match(visible, /<h3>Build<\/h3>/);
  assert.match(visible, /<h3>Launch &amp; Care<\/h3>/);
  assert.match(visible, /id="pricing"/);
  assert.match(visible, /id="process"/);
  assert.match(visible, /third-party[\s\S]{0,180}separately/i);
  assert.equal((visible.match(/<details>/g) ?? []).length, 3);
  assert.doesNotMatch(visible, /Optional enhancements|agreed content support|Business Tools &amp; Integrations/);
});

test("describes SEO without publishing a price", async () => {
  const html = await pageHtml("/seo");
  const visible = visibleHtml(html);
  assert.match(html, /<h1>Search optimization\.<\/h1>/);
  assert.match(visible, /Request a quote/);
  assert.match(visible, /SEO audit/);
  assert.match(visible, /90-day launch/);
  assert.match(visible, /Ongoing monthly SEO/);
  assert.match(visible, /Core Web Vitals/);
  assert.match(visible, /Indexing/);
  assert.match(visible, /Structured data/);
  assert.match(visible, /Titles and meta descriptions/);
  assert.match(visible, /Internal links/);
  assert.match(visible, /Google Business Profile/);
  assert.match(visible, /Local citations/);
  assert.match(visible, /Google Maps/);
  assert.match(visible, /ChatGPT/);
  assert.match(visible, /Gemini/);
  assert.doesNotMatch(visible, /\$\s?\d/);
  assert.doesNotMatch(visible, /Starting from|Custom proposal|\/month|\/hour/);
});

test("moves Care and Care Plus terms onto the care page", async () => {
  const html = await pageHtml("/care");
  const visible = visibleHtml(html);
  assert.match(html, /<h1>Ongoing care\.<\/h1>/);
  assert.match(visible, /<h3>Care<\/h3>/);
  assert.match(visible, /Starting from \$199\/month/);
  assert.match(visible, /Up to 1 hour of small content changes per month/);
  assert.match(visible, /<h3>Care Plus<\/h3>/);
  assert.match(visible, /Starting from \$399\/month/);
  assert.match(visible, /Up to 3 hours of changes per month/);
  assert.match(visible, /Priority response/);
  assert.match(visible, /Monthly site report/);
  assert.match(visible, /Additional work is billed at \$125\/hour\. Unused hours do not roll over\. A 3-month minimum term applies\./);
  assert.match(visible, /Tailored ongoing partnerships are available for select clients who need regular design and development capacity/);
  assert.doesNotMatch(visible, /\$150\/month|agreed content support/);
});

test("keeps the inquiry email on the contact page and links it", async () => {
  const html = await pageHtml("/contact");
  const contactHtml = html.match(/<section class="contact-section[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.match(html, /<h1>Build it well\./);
  assert.match(contactHtml, /<a class="contact-email" href="mailto:northlinestudio425@gmail\.com">northlinestudio425@gmail\.com<\/a>/);
  assert.match(contactHtml, /class="button button-primary contact-cta" href="mailto:northlinestudio425@gmail\.com"/);
  assert.equal((contactHtml.match(/<li>/g) ?? []).length, 4);
  assert.match(contactHtml, /An early idea is enough/);
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /hello@yourstudio\.com|Start the conversation/);
});

test("gives every page a first-screen mailto and cross-links", async () => {
  for (const page of pages) {
    const html = await pageHtml(page.path);
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, page.path);
    assert.match(html, /href="mailto:northlinestudio425@gmail\.com"/, page.path);
    assert.match(html, /class="[^"]*contact-cta[^"]*" href="mailto:northlinestudio425@gmail\.com"/, page.path);
    assert.doesNotMatch(html, /<form\b/i);
    assert.doesNotMatch(html, /small business|small-business|local business/i);
    assert.doesNotMatch(html, /↗/);
    assert.doesNotMatch(html, /Seattle|Bellevue|Kirkland|Redmond|Washington/);
    assert.match(html, /aria-label="北境 logo"/);
    assert.match(html, /aria-controls="mobile-navigation"/);
    assert.doesNotMatch(html, /<details class="mobile-menu"/);

    const hrefs = [...html.matchAll(/href="(\/(?:websites|seo|care|contact))"/g)].map((match) => match[1]);
    const uniqueOthers = new Set(hrefs.filter((href) => href !== page.path));
    assert.ok(uniqueOthers.size >= 3, `${page.path} cross-links ${[...uniqueOthers].join(",")}`);

    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
    for (const hash of html.matchAll(/href="#([^"]+)"/g)) {
      assert.ok(ids.has(hash[1]), `${page.path} missing #${hash[1]}`);
    }

    if (page.path === "/contact") {
      const contact = html.match(/<section class="contact-section[\s\S]*?<\/section>/)?.[0] ?? "";
      const sentence = contact.indexOf("email us directly");
      const button = contact.indexOf("contact-cta");
      assert.ok(sentence > -1 && button > sentence);
    } else {
      const intro = html.match(/<section class="(?:page-intro|home-hero)[^"]*"[\s\S]*?<\/section>/)?.[0] ?? "";
      assert.match(intro, /contact-cta/);
      assert.doesNotMatch(intro, /<img\b/);
      const sentence = Math.max(intro.indexOf("page-lead"), intro.indexOf("home-hero-lead"));
      const button = intro.indexOf("contact-cta");
      assert.ok(sentence > -1 && button > sentence, page.path);
    }
  }
});

test("adds optimized diagram images below the fold on each service page", async () => {
  const diagrams = {
    "/websites": ["/diagrams/content-site.svg", "/diagrams/storefront.svg", "/diagrams/migration.svg"],
    "/seo": ["/diagrams/search-check.svg", "/diagrams/search-checklist.svg", "/diagrams/search-presence.svg"],
    "/care": ["/diagrams/care-layers.svg", "/diagrams/care-monitor.svg", "/diagrams/care-month.svg"],
  };

  for (const [pathname, sources] of Object.entries(diagrams)) {
    const html = await pageHtml(pathname);
    const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
    assert.equal(imgs.length, 3, pathname);
    for (const [index, img] of imgs.entries()) {
      assert.match(img, new RegExp(`src="${sources[index].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
      assert.match(img, /\balt="[^"]{20,}"/);
      assert.match(img, /\bwidth="640"/);
      assert.match(img, /\bheight="400"/);
      assert.match(img, /\bloading="lazy"/);
      assert.match(img, /\bdecoding="async"/);
      assert.doesNotMatch(img, /portfolio|screenshot|client work|yourbrand/i);
    }
    const introEnd = html.indexOf("</section>");
    assert.equal(html.slice(0, introEnd).includes("<img"), false);
  }

  for (const source of Object.values(diagrams).flat()) {
    const file = new URL(`../public${source}`, import.meta.url);
    const info = await stat(file);
    assert.ok(info.size < 8000, source);
    const svg = await readFile(file, "utf8");
    assert.match(svg, /<svg/);
    assert.doesNotMatch(svg, /<text\b|yourbrand|portfolio/i);
  }
});

test("publishes unique metadata, canonicals, and social tags", async () => {
  for (const page of pages) {
    const html = await pageHtml(page.path);
    const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
    const description = decode(meta(html, "name", "description"));
    assert.equal(title, page.title);
    assert.ok(title.length <= 60, `${page.path} title is ${title.length}`);
    assert.equal(description, page.description);
    assert.ok(description.length <= 155, `${page.path} description is ${description.length}`);
    assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1);
    assert.match(html, new RegExp(`<link rel="canonical" href="${page.canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\/>`));
    assert.match(html, new RegExp(`property="og:url" content="${page.canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
    assert.match(html, /property="og:image" content="https:\/\/www\.nlstudio\.io\/og\.png"/);
    assert.match(html, /property="og:image:width" content="1658"/);
    assert.match(html, /property="og:image:height" content="949"/);
    assert.equal(decode(meta(html, "property", "og:title")), page.title);
    assert.equal(decode(meta(html, "property", "og:description")), page.description);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
    assert.equal(decode(meta(html, "name", "twitter:title")), page.title);
    assert.equal(decode(meta(html, "name", "twitter:description")), page.description);
    assert.match(html, /name="twitter:image" content="https:\/\/www\.nlstudio\.io\/og\.png"/);
    assert.match(html, /rel="icon" href="https:\/\/www\.nlstudio\.io\/favicon\.png"/);
    assert.doesNotMatch(html, /github\.io|peter-wu-studio/);
    assert.equal(new Set(pages.map((entry) => entry.title)).size, pages.length);
    assert.equal(new Set(pages.map((entry) => entry.description)).size, pages.length);
  }
});

test("keeps studio structured data and adds Service markup on service pages", async () => {
  const home = jsonLdBlocks(await pageHtml("/"));
  assert.equal(home.length, 1);
  const studio = home[0];
  assert.equal(studio["@context"], "https://schema.org");
  assert.equal(studio["@type"], "ProfessionalService");
  assert.equal(studio.name, "Northline Studio");
  assert.equal(studio.url, "https://www.nlstudio.io/");
  assert.equal(studio.email, "northlinestudio425@gmail.com");
  assert.equal(studio.logo.url, "https://www.nlstudio.io/favicon.png");
  assert.equal(studio.image.url, "https://www.nlstudio.io/og.png");
  assert.equal(studio.slogan, "Built to stand out. Made to work.");
  const serialized = JSON.stringify(studio);
  for (const name of [
    "Website design and builds",
    "Search optimization",
    "Ongoing care",
    "The Essential Website",
    "The Signature Website",
    "Business Systems",
    "Care Plus",
    "Starting from $2,500",
    "Starting from $199/month",
    "Custom proposal",
  ]) {
    assert.match(serialized, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  const seoOffer = studio.hasOfferCatalog.itemListElement.find((item) => item.name === "Search optimization");
  assert.equal(seoOffer.url, "https://www.nlstudio.io/seo");
  assert.equal(Object.hasOwn(seoOffer, "priceSpecification"), false);
  assert.doesNotMatch(JSON.stringify(seoOffer), /minPrice|"price"/);
  assert.doesNotMatch(serialized, /streetAddress|addressLocality|postalCode|telephone|aggregateRating|"review"/i);

  const expectations = [
    ["/websites", "Website design and builds", "https://www.nlstudio.io/websites", true],
    ["/tools", "Business tools and workflow systems", "https://www.nlstudio.io/tools", false],
    ["/shopify", "Shopify stores and commerce", "https://www.nlstudio.io/shopify", false],
    ["/seo", "Search optimization", "https://www.nlstudio.io/seo", false],
    ["/care", "Ongoing care", "https://www.nlstudio.io/care", true],
  ];

  for (const [pathname, name, url, hasPrice] of expectations) {
    const blocks = jsonLdBlocks(await pageHtml(pathname));
    assert.equal(blocks.filter((block) => block["@type"] === "ProfessionalService").length, 1);
    const service = blocks.find((block) => block["@type"] === "Service");
    assert.ok(service, pathname);
    assert.equal(service.name, name);
    assert.equal(service.url, url);
    assert.equal(service.provider["@id"], studio["@id"]);
    const serviceJson = JSON.stringify(service);
    if (hasPrice) {
      assert.match(serviceJson, /minPrice/);
    } else {
      if (pathname === "/seo") assert.equal(service.offers, undefined);
      assert.doesNotMatch(serviceJson, /minPrice|"price"|\$/);
    }
  }

  const websites = jsonLdBlocks(await pageHtml("/websites")).find((block) => block["@type"] === "Service");
  assert.match(JSON.stringify(websites), /2500/);
  assert.match(JSON.stringify(websites), /3500/);
  const care = jsonLdBlocks(await pageHtml("/care")).find((block) => block["@type"] === "Service");
  const careJson = JSON.stringify(care);
  assert.match(careJson, /199/);
  assert.match(careJson, /399/);
  assert.match(careJson, /125/);
  assert.match(careJson, /Unused hours do not roll over/);
});

test("forwards retired homepage anchors and keeps in-page jumps usable", async () => {
  const html = await pageHtml("/");
  assert.match(html, /seo:\s*"\/seo"/);
  assert.match(html, /care:\s*"\/care"/);
  assert.match(html, /pricing:\s*"\/websites#pricing"/);
  assert.match(html, /contact:\s*"\/contact"/);
  assert.match(html, /process:\s*"\/websites#process"/);
  assert.match(html, /if \(path !== "\/"\) return/);
  assert.match(html, /location\.replace\(dest\)/);

  const [mobileMenu, sectionLink] = await Promise.all([
    readFile(new URL("../app/MobileMenu.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/SectionLink.tsx", import.meta.url), "utf8"),
  ]);

  for (const href of ["/websites", "/seo", "/care", "/contact"]) {
    assert.equal((mobileMenu.match(new RegExp(`href: "${href}"`, "g")) ?? []).length, 1);
  }
  assert.doesNotMatch(mobileMenu, /href: "#/);
  assert.match(sectionLink, /querySelector\("\.site-header"\)/);
  assert.match(sectionLink, /window\.scrollTo/);
  assert.match(sectionLink, /window\.history\.pushState/);
  assert.doesNotMatch(sectionLink, /document\.(?:body|documentElement)\.style\.overflow/);
});

test("ships project assets and production metadata sources", async () => {
  const [layout, site, metadata, packageJson, styles] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/site.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page-metadata.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(metadata, /og\.png/);
  assert.match(layout, /favicon\.png/);
  assert.match(layout, /metadataBase: new URL\(siteOrigin\)/);
  assert.match(site, /https:\/\/www\.nlstudio\.io/);
  assert.match(site, /northlinestudio425@gmail\.com/);
  assert.doesNotMatch(layout, /github\.io|peter-wu-studio/);
  assert.doesNotMatch(site, /github\.io/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(styles, /enhancements-panel/);
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/favicon.png", import.meta.url));
  await access(new URL("../public/northline-logo.svg", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});

test("serves robots.txt and a sitemap of every page", async () => {
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
  assert.deepEqual(locs, pages.map((page) => page.canonical));
  assert.doesNotMatch(xml, /github\.io|mac-mini/);

  const exported = await Promise.all([
    readFile(new URL("../dist/client/robots.txt", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/sitemap.xml", import.meta.url), "utf8"),
    ...pages.map((page) => readFile(new URL(`../dist/client/${page.file}`, import.meta.url), "utf8")),
  ]);
  const [exportedRobots, exportedSitemap, ...exportedPages] = exported;
  assert.match(exportedRobots, /Sitemap:\s*https:\/\/www\.nlstudio\.io\/sitemap\.xml/);
  for (const page of pages) {
    assert.match(exportedSitemap, new RegExp(`<loc>${page.canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/loc>`));
  }
  exportedPages.forEach((html, index) => {
    assert.match(html, new RegExp(`rel="canonical" href="${pages[index].canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
    assert.match(html, /property="og:image" content="https:\/\/www\.nlstudio\.io\/og\.png"/);
    assert.match(html, /type="application\/ld\+json"/);
    assert.doesNotMatch(html, /github\.io/);
  });
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
