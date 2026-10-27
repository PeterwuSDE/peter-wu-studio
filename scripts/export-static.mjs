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

const [html, robots, sitemap] = await Promise.all([
  render("/", "text/html"),
  render("/robots.txt", "text/plain"),
  render("/sitemap.xml", "application/xml"),
]);

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(new URL("index.html", outputDirectory), html),
  writeFile(new URL("404.html", outputDirectory), html),
  writeFile(new URL("robots.txt", outputDirectory), robots),
  writeFile(new URL("sitemap.xml", outputDirectory), sitemap),
  writeFile(new URL(".nojekyll", outputDirectory), ""),
]);

console.log("Static site exported to dist/client");
