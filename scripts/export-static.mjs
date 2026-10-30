import { mkdir, writeFile } from "node:fs/promises";

const outputDirectory = new URL("../dist/client/", import.meta.url);
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("static-export", Date.now().toString());

const { default: worker } = await import(workerUrl.href);
const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function render(pathname, accept) {
  const response = await worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept } }),
    env,
    ctx,
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Static render failed for ${pathname} with status ${response.status}: ${body.slice(0, 180)}`);
  }

  return response.text();
}

const pages = [
  ["/", "index.html"],
  ["/websites", "websites/index.html"],
  ["/tools", "tools/index.html"],
  ["/shopify", "shopify/index.html"],
  ["/seo", "seo/index.html"],
  ["/care", "care/index.html"],
  ["/contact", "contact/index.html"],
];

const [renderedPages, robots, sitemap] = await Promise.all([
  Promise.all(pages.map(async ([pathname, file]) => [file, await render(pathname, "text/html")])),
  render("/robots.txt", "text/plain"),
  render("/sitemap.xml", "application/xml"),
]);

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  ...renderedPages.map(async ([file, html]) => {
    const target = new URL(file, outputDirectory);
    await mkdir(new URL("./", target), { recursive: true });
    await writeFile(target, html);
  }),
  writeFile(new URL("404.html", outputDirectory), renderedPages[0][1]),
  writeFile(new URL("robots.txt", outputDirectory), robots),
  writeFile(new URL("sitemap.xml", outputDirectory), sitemap),
  writeFile(new URL(".nojekyll", outputDirectory), ""),
]);

console.log("Static site exported to dist/client");
