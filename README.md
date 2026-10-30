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
