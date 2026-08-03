import { mkdir, writeFile } from "node:fs/promises";

const outputDirectory = new URL("../dist/client/", import.meta.url);
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("static-export", Date.now().toString());

const { default: worker } = await import(workerUrl.href);
const response = await worker.fetch(
  new Request("http://localhost/", { headers: { accept: "text/html" } }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);

if (!response.ok) {
  throw new Error(`Static render failed with status ${response.status}`);
}

const basePath = process.env.GITHUB_PAGES_BASE ?? "/";
const normalizedBase = `/${basePath.split("/").filter(Boolean).join("/")}${basePath === "/" ? "" : "/"}`;
let html = await response.text();

if (normalizedBase !== "/") {
  html = html.replaceAll('"/assets/', `"${normalizedBase}assets/`);
}

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(new URL("index.html", outputDirectory), html),
  writeFile(new URL("404.html", outputDirectory), html),
  writeFile(new URL(".nojekyll", outputDirectory), ""),
]);

console.log(`Static site exported to dist/client${normalizedBase === "/" ? "" : ` for ${normalizedBase}`}`);
