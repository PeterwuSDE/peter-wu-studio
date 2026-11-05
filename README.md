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

The API is a Node function on the existing Vercel project (`api/seo-check.ts`), next to the static export. It uses shared Redis REST storage for scan snapshots, cache, request bindings, and atomic per-IP/daily quotas across functions and cold starts. Redis key TTLs enforce the 7-day scan retention and configured cache windows. There is no browser, model, paid SEO lookup, or queue.

Before enabling scans on Vercel, connect a Redis REST service and configure either `UPSTASH_REDIS_REST_URL` plus `UPSTASH_REDIS_REST_TOKEN`, or `KV_REST_API_URL` plus `KV_REST_API_TOKEN`. Both the scan and inquiry functions must receive the same credentials for their environment. Production and preview use separate key prefixes. No account, subscription, or paid service is created automatically. Review the provider quota and billing before configuring it. Missing, partial, invalid, or unavailable shared storage never falls back to memory on Vercel: the scan returns a readable unavailable response with no fabricated report.

Memory and `SEO_CHECK_STORE_PATH` remain available only for local development or a deliberately single-process development server without production mode. A local file is not a Vercel persistence option; do not commit it.

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
| `SEO_CHECK_STORE_PATH` | unset; local development only |

`vercel.json` gives the scan function up to 30 seconds to accommodate the 12-second website/DNS fetch budget and bounded shared-storage operations. Redis REST calls each have a 1.5-second deadline and do not follow redirects with credentials. Lower `SEO_CHECK_TIMEOUT_MS` if the hosting plan has a shorter runtime limit. Hosting, bandwidth, storage and notification delivery may have costs; no LLM or paid SEO/search API is called.

## Vercel deployment

Import `PeterwuSDE/peter-wu-studio` into Vercel and deploy the `main` branch.
The checked-in `vercel.json` configures the framework preset as Other, builds
with `npm run export:static`, and serves `dist/client`. The static pages build without environment variables; the scan API requires shared Redis REST credentials.

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
