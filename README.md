# Northline Studio

A responsive multi-page website for an independent web design, development, hosting, and support business. Pages: home, websites, SEO, care, and contact.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Each page includes a visible email link to `northlinestudio425@gmail.com`. The contact page also lists what to include in an inquiry. There is no contact form.

## Homepage SEO check

`POST /api/seo-check` reads one public homepage (HTML and response headers only) and returns a deterministic rule result. Shared request and response types live in `shared/seo-check/contract.ts`. Import that file from the site UI. Do not import `shared/seo-check/index.ts` into client code; the server entry uses Node networking.

The API is a Node function on the existing Vercel project (`api/seo-check.ts`), next to the static export. It does not add a database, queue, browser, model, or paid lookup. Cache, per-IP limits, the daily cap, and 7-day scan retention use process memory by default, which is included and has no extra fee. That state stays on one server process. Vercel does not share it across isolates. `SEO_CHECK_STORE_PATH` is only for a single long-running Node process that can keep a file; do not commit that file.

| Variable | Default |
| --- | --- |
| `SEO_CHECK_MAX_REDIRECTS` | 3 |
| `SEO_CHECK_TIMEOUT_MS` | 12000 |
| `SEO_CHECK_MAX_BYTES` | 1048576 |
| `SEO_CHECK_SUCCESS_CACHE_TTL_MS` | 86400000 |
| `SEO_CHECK_FAILURE_CACHE_TTL_MS` | 120000 |
| `SEO_CHECK_IP_LIMIT` | 5 new scans per hour |
| `SEO_CHECK_IP_CACHE_LIMIT` | 60 cache hits per hour |
| `SEO_CHECK_DAILY_CAP` | 200, or `unlimited` |
| `SEO_CHECK_RETENTION_MS` | 7 days |
| `SEO_CHECK_ALLOWED_ORIGINS` | extra exact origins, comma-separated |
| `SEO_CHECK_STORE_PATH` | unset (memory) |

`vercel.json` sets the function `maxDuration` to 15 seconds so the 12 second fetch budget can finish. Lower `SEO_CHECK_TIMEOUT_MS` if the hosting plan stops the function sooner. Hosting and bandwidth can still cost money; this path does not call a paid SEO API.

## Vercel deployment

Import `PeterwuSDE/peter-wu-studio` into Vercel and deploy the `main` branch.
The checked-in `vercel.json` configures the framework preset as Other, builds
with `npm run export:static`, and serves `dist/client`. No environment variables
are required.

The production origin is [https://www.nlstudio.io](https://www.nlstudio.io).
Canonical URLs, Open Graph and Twitter images, `robots.txt`, and `sitemap.xml`
all use that host. `/mac-mini` permanently redirects to the homepage.

Alternatively, after signing in with `vercel login`, run:

```bash
vercel --prod
```

The old GitHub Pages copy is not a second site. `.github/workflows/pages.yml`
publishes a short redirect to `https://www.nlstudio.io/` and does not upload
the Vercel build. Disabling the `github.io` host completely is a repository
setting (Settings → Pages → None). After that setting is turned off, delete
the Pages workflow so later pushes do not try to deploy it.
