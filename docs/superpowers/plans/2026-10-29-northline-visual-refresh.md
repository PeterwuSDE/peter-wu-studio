# Northline Studio Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the rough page split into a cohesive studio presentation and expose all four core services.

**Architecture:** Retain the React/vinext static-export application. Share decorative interface compositions across the homepage and new service pages; keep existing prices, contact behavior, SEO metadata and deployment targets intact.

**Tech Stack:** React 19, TypeScript, vinext, CSS, Node rendered-HTML tests.

**Spec:** docs/superpowers/specs/2026-10-29-northline-visual-refresh.md

## Global Constraints
- Production origin remains https://www.nlstudio.io.
- Contact remains northlinestudio425@gmail.com.
- Essential remains $2,500; Signature remains $3,500; Care remains $199/month and Care Plus $399/month.
- No additional production dependencies, fabricated claims, or simulated working audit functionality.
- Treat visual choices as design recommendations, not proven reductions in bounce rate.

## Review Focus
- Navigation remains usable on mobile and by keyboard.
- Decorative interface compositions are identified as illustrative and hidden from assistive technologies where appropriate.
- Long headings and service descriptions fit narrow screens.
- New routes export correctly and have unique metadata and canonical URLs.
- Existing service terms and real contact actions remain intact.

### Task 1: Homepage and shared presentation
**Files:** app/page.tsx, app/StudioPreview.tsx, app/globals.css, app/Chrome.tsx.
- [x] Replace the generic intro with a two-part studio hero and a clearly illustrative interface composition.
- [x] Present four service entrances and a distinct Care band without publishing prices on the homepage.
- [x] Improve shared service-page spacing, section transitions and focus styles without removing existing content.
- [x] Update affected rendered-HTML checks, retaining behavior and metadata coverage.

### Task 2: Dedicated service destinations and integration
**Files:** app/tools/page.tsx, app/shopify/page.tsx, app/SiteNav.tsx, app/MobileMenu.tsx, app/site.ts, scripts/export-static.mjs, app/structured-data.ts, tests/rendered-html.test.mjs.
- [x] Add focused Tools and Shopify pages using existing business scope and proposal-based pricing.
- [x] Add their navigation, exported routes, sitemap entries and structured-data links.
- [x] Keep existing website sections available for legacy deep links; link their specialized pages.
- [x] Run npm test and report actual output; inspect the complete diff and obtain a fresh review before integration.

## Execution ledger
- Source snapshot: PeterwuSDE/peter-wu-studio at 5db73f51f381fd488ff092a84528e17248b2276c.
- The workspace initially had no repository checkout or node_modules. Source was obtained through the connected GitHub API because network shell operations did not complete.
- Presentation-only work does not add tests for CSS declarations; existing integration coverage is adapted for changed navigation and page structure.
- Validation: npm test completed the production build and static export. node --test --test-isolation=none --test-reporter=spec tests/rendered-html.test.mjs executed all 15 named tests, with 15 passes and zero failures. The explicit command avoids the default Node runner's one-file summary.
- Typecheck limitation: tsc --noEmit reports cloudflare:workers, Fetcher, and D1Database type errors in unchanged scaffold files. A clean baseline snapshot with the same dependencies produces the same three errors; no new errors were introduced.
- Fresh read-only review: no Critical or Important findings. Minor deferred: homepage metadata still uses the previous Web Design/SEO/Care wording.
- Browser rendering, actual pixel overflow, runtime keyboard behavior, and conversion impact are not verified because no supported browser tool is available. A self-contained seven-page visual preview is provided for review.
- Ruling: preserve existing service sections and deep links while adding dedicated Tools and Shopify destinations; this avoids breaking existing links. The old website page retains some duplicate scope descriptions.
- Ruling: do not implement or simulate the planned SEO audit backend in a presentation revision; its product design remains a separate workstream.
