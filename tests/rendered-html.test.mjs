import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";

let renderCount = 0;

const pages = [
  {
    path: "/",
    file: "index.html",
    canonical: "https://www.nlstudio.io/",
    title: "Northline Studio | Websites, Stores & Business Tools",
    description: "Websites, online stores, and booking tools for small businesses. Explore Northline demos, website redesigns, search optimization, and ongoing care.",
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

function pageText(html) {
  return decode(visibleHtml(html).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
}

async function pageHtml(pathname) {
  const response = await render(pathname);
  assert.equal(response.status, 200, pathname);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  return response.text();
}

test("explains customer tasks and links three self-initiated demos", async () => {
  const html = await pageHtml("/");
  const visible = visibleHtml(html), text = pageText(html);
  assert.equal((visible.match(/<h1[\s>]/g) ?? []).length, 1);
  assert.match(text, /Make it easier to choose your business/);
  assert.match(text, /small businesses/);
  assert.match(text, /request a quote, book a time, or find the right product/);
  for (const name of ["Cedar & Stone", "Form & Field", "Daybook"]) assert.ok(text.includes(name));
  for (const path of ["home-services", "store", "bookings"]) {
    assert.ok(visible.includes('href="/demos/' + path + '/index.html"'));
    const file = await readFile(new URL("../dist/client/demos/" + path + "/index.html", import.meta.url), "utf8");
    assert.match(file, /Self-initiated demo/);
    assert.match(file, /noindex,follow/);
    assert.match(file, /shared\/demo.js/);
  }
  for (const label of ["Explore websites", "Explore business tools", "Explore Shopify", "Explore SEO", "Explore ongoing care"]) assert.ok(text.includes(label));
  assert.ok(visible.indexOf('id="work"') < visible.indexOf('id="services"'));
  assert.match(text, /fictional brands and sample data/);
  assert.match(text, /no Shopify connection/);
  assert.ok(text.includes("The Essential Website starts at $2,500"));
  assert.ok(text.includes("The Signature Website starts at $3,500"));
  assert.match(visible, /href="\/care#plans"/);
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

test("keeps website packages and migration information while linking specialist services", async () => {
  const html = await pageHtml("/websites");
  const visible = visibleHtml(html);
  const text = pageText(html);
  assert.match(visible, /A better/);
  assert.match(visible, /content-only sites/);
  assert.match(visible, /Wix or Squarespace/);
  assert.match(visible, /slow or outdated/);
  assert.match(visible, /The Essential Website/);
  assert.match(text, /Starting from \$2,500/);
  assert.doesNotMatch(visible, /Starting from \$1,500/);
  assert.match(visible, /Up to 3 custom-designed pages/);
  assert.match(visible, /The Signature Website/);
  assert.match(text, /Starting from \$3,500/);
  assert.match(visible, /Up to 7 custom-designed pages/);
  assert.match(visible, /id="shopify" href="\/shopify"/);
  assert.match(visible, /id="systems" href="\/tools"/);
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
  assert.match(visible, /Search optimization/);
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
  const text = pageText(html);
  assert.match(visible, /Ongoing care/);
  assert.match(visible, /<h3>Care<\/h3>/);
  assert.match(text, /Starting from \$199\s*\/ month/);
  assert.match(visible, /Up to 1 hour of small content changes per month/);
  assert.match(visible, /<h3>Care Plus<\/h3>/);
  assert.match(text, /Starting from \$399\s*\/ month/);
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
    assert.doesNotMatch(html, /Seattle|Bellevue|Kirkland|Redmond|Washington/);
    assert.match(html, /aria-label="北境 logo"/);
    assert.match(html, /aria-controls="mobile-navigation"/);
    assert.ok(html.includes('/section-navigation.js'), page.path + " static fragment navigation guard");
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
      const intro = html.match(/<section class="(?:page-intro|home-hero|service-hero)[^"]*"[\s\S]*?<\/section>/)?.[0] ?? "";
      assert.match(intro, /contact-cta/);
      const sentence = Math.max(intro.indexOf("page-lead"), intro.indexOf("home-hero-lead"));
      const button = intro.indexOf("contact-cta");
      assert.ok(sentence > -1 && button > sentence, page.path);
    }
  }
});

test("gives every service four clear chapters with valid jump links and honest visuals", async () => {
  for (const pathname of ["/websites", "/tools", "/shopify", "/seo", "/care"]) {
    const html = visibleHtml(await pageHtml(pathname));
    const chapters = [...html.matchAll(/data-service-section="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(chapters, ["intro", "experience", "scope", "next"], pathname);
    assert.match(html, /aria-label="On this page"/);
    for (const id of ["overview", "experience", "scope", "next"]) {
      assert.match(html, new RegExp(`href="#${id}"`));
      assert.match(html, new RegExp(`id="${id}"`));
    }
    assert.match(html, /<figure class="service-visual/);
    assert.match(html, /<figcaption>Illustrative/);
    assert.match(html, /not client work or live results/);
    assert.match(html, /<details[\s>]/);
    assert.doesNotMatch(html, /Most popular|guaranteed rankings/i);
  }
});

test("ships bounded first-screen WebP artwork for websites and commerce", async () => {
  for (const [pathname, asset] of [["/websites", "studio-materials"], ["/shopify", "ceramic-collection"]]) {
    const html = await pageHtml(pathname);
    const image = html.match(/<img\b[^>]*>/)?.[0] ?? "";
    assert.ok(image.includes(`/visuals/${asset}.webp`));
    assert.match(image, /width="1536"/);
    assert.match(image, /height="1024"/);
    assert.match(image, /alt=""/);
    assert.match(image, /fetchPriority="high"/i);
    assert.doesNotMatch(image, /loading="lazy"/);
    const path = new URL(`../public/visuals/${asset}.webp`, import.meta.url);
    assert.ok((await stat(path)).size < 1_500_000);
    const bytes = await readFile(path);
    assert.equal(bytes.subarray(0, 4).toString(), "RIFF");
    assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
    await access(new URL(`../dist/client/visuals/${asset}.webp`, import.meta.url));
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


test("exports the static fragment navigation guard", async () => {
  const source = await readFile(new URL("../public/section-navigation.js", import.meta.url), "utf8");
  const shipped = await readFile(new URL("../dist/client/section-navigation.js", import.meta.url), "utf8");
  assert.equal(shipped, source);
});
