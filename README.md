# Northline Studio

A responsive one-page website for an independent web design, development, hosting, and support business.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The contact button opens an email to `northlinestudio425@gmail.com`.

## Vercel deployment

Import `PeterwuSDE/peter-wu-studio` into Vercel and deploy the `main` branch.
The checked-in `vercel.json` configures the framework preset as Other, builds
with `npm run export:static`, and serves `dist/client`. No environment variables
are required. Do not set `GITHUB_PAGES_BASE` on Vercel: its deployment serves
the site from `/`.

Alternatively, after signing in with `vercel login`, run:

```bash
vercel --prod
```

GitHub Pages remains available through its existing workflow. Connecting the
GitHub repository in Vercel enables deployments for future pushes to `main`.
