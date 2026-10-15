# Northline Studio Homepage Repositioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition the Northline Studio homepage as a premium digital partner for founders and owner-led businesses across websites, commerce, business systems, deployment, and ongoing management.

**Architecture:** Keep the existing static single-page Next.js/vinext architecture, SVG identity, section-link navigation, and Vercel deployment. Update local content arrays and section markup in `app/page.tsx`, make only supporting responsive-style changes in `app/globals.css`, update metadata in `app/layout.tsx`, and expand the rendered-HTML contract in `tests/rendered-html.test.mjs` before each content change.

**Tech Stack:** Next.js 16, React 19, TypeScript, vinext/Vite, CSS, Node test runner, Vercel

**Spec:** `docs/superpowers/specs/2026-10-15-northline-studio-positioning-and-homepage-design.md`

## Global Constraints

- Keep the site static: no backend, database, authentication, form handler, CMS, or new product dependency.
- Preserve the current SVG logo, FangSong logo typography, visual identity, fixed header, section-link scrolling behavior, and mobile-menu behavior.
- Keep contact as a static display of `northlinestudio425@gmail.com`; do not add a form or `mailto:` link.
- Keep public navigation as Services, Pricing, Process, About, and Start a project.
- Do not reintroduce Previous Work, upper-right arrow glyphs, or small/local-business targeting.
- Public prices remain exactly `$1,500`, `$3,500`, and `$150/month`; Commerce and Business Systems use `Custom proposal`; Ongoing Partnership has no fixed public price.
- Treat third-party platform, subscription, theme, font, application, and transaction charges as separate from Northline's service fees.
- Make no deployment-platform changes; GitHub `main`, Vercel, and `nlstudio.io` remain the production path.

## File Map

- Modify `app/page.tsx`: homepage content arrays, section markup, public pricing, partnership language, FAQ, contact guidance, and footer summary.
- Modify `app/globals.css`: three-path introductory layout, four-card pricing layout, ongoing-partnership panel styling, and responsive adjustments required by the revised content.
- Modify `app/layout.tsx`: title, description, Open Graph, and Twitter metadata reflecting the broader digital-partner positioning.
- Modify `tests/rendered-html.test.mjs`: rendered copy contracts, service/pricing counts, prohibited-copy guards, navigation-target consistency, metadata checks, and static-contact checks.
- Preserve `app/SectionLink.tsx`: existing hash navigation and scroll-unlock behavior unless verification exposes a regression.
- Preserve `app/MobileMenu.tsx`: existing interaction implementation; only change its link data if navigation requirements change unexpectedly.

## Review Focus

- **Task 5 — Hash navigation after content changes:** desktop section jumps must land below the fixed header and normal wheel/trackpad scrolling must continue immediately afterward.
- **Task 5 — Desktop/mobile link parity:** every primary destination in the desktop header must remain present in the mobile link configuration and point to an existing section ID.
- **Task 3 — Proposal pricing ambiguity:** `Custom proposal` must not be paired with language that implies a fixed included scope for Commerce, Business Systems, or Ongoing Partnership.
- **Task 4 — Contact without form logic:** a visitor must still see and be able to copy the email address and understand what project information to include.
- **Task 5 — Narrow-screen content pressure:** long headings, pricing labels, and the email address must wrap without horizontal page overflow at a 390-pixel viewport.

---

### Task 1: Core Positioning, Metadata, and Engagement Paths

**Files:**
- Modify: `tests/rendered-html.test.mjs`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: existing `Home`, `NorthlineLogo`, and `SectionLink` components.
- Produces: unchanged section IDs plus hero copy and an `.engagement-paths` block containing three path articles.

- [ ] **Step 1: Replace the old hero contract with failing positioning tests**

In `tests/rendered-html.test.mjs`, update the homepage test to assert:

```js
assert.match(html, /We build the digital side of ambitious businesses/);
assert.match(html, /founders and owner-led businesses/i);
assert.match(html, /Build something new/);
assert.match(html, /Improve what already exists/);
assert.match(html, /Let us manage it for you/);
assert.equal((html.match(/<article class="engagement-path"/g) ?? []).length, 3);
assert.doesNotMatch(html, /A digital studio for brands that need to look/);
```

Extend the metadata test to assert that `app/layout.tsx` describes websites, commerce, and business systems rather than websites alone.

- [ ] **Step 2: Run the tests and confirm the old homepage fails the new contract**

Run: `npm test`

Expected: FAIL on the new hero, audience, engagement-path, and metadata assertions.

- [ ] **Step 3: Update metadata in `app/layout.tsx`**

Set the shared title to `Northline Studio | Design, Commerce & Digital Systems`. Use a description that identifies Northline as a design-led digital partner that designs, builds, launches, and manages websites, commerce experiences, and business systems. Apply consistent positioning to page, Open Graph, and Twitter fields while preserving the existing asset paths and metadata structure.

- [ ] **Step 4: Rewrite the hero in `app/page.tsx`**

Use `We build the digital side of ambitious businesses.` as the main heading. Supporting copy must include founders and owner-led businesses and the verbs design, build, launch, and manage. Keep the existing hero visual, proof row, and contact-section CTA behavior; update their labels only where they conflict with the broader positioning.

- [ ] **Step 5: Replace the intro copy with three engagement paths**

Keep the existing `intro-section` location. Replace `intro-grid`/`intro-copy` with one short positioning introduction and exactly three `<article className="engagement-path">` elements titled:

- `Build something new.`
- `Improve what already exists.`
- `Let us manage it for you.`

Each description must map to the purpose in the spec without listing specific platforms.

- [ ] **Step 6: Add the minimum responsive CSS for the three-path block**

Add `.engagement-paths` and `.engagement-path` styles in `app/globals.css`. Use a three-column grid on wide screens and a single column in the existing mobile breakpoint. Reuse existing colors, rules, spacing scales, serif emphasis, and mono-label treatment; do not introduce a new visual system.

- [ ] **Step 7: Run the focused verification**

Run: `npm test`

Expected: PASS, including the new hero, metadata, and three-path assertions.

- [ ] **Step 8: Commit the positioning slice**

```bash
git add app/layout.tsx app/page.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "Reposition Northline Studio homepage"
```

### Task 2: Four Public Service Families

**Files:**
- Modify: `tests/rendered-html.test.mjs`
- Modify: `app/page.tsx`
- Modify: `app/globals.css` only if four-item rhythm needs adjustment

**Interfaces:**
- Consumes: the existing `services` array and `.service-list` renderer.
- Produces: exactly four service records with the existing `{ number, title, text, tags }` shape.

- [ ] **Step 1: Write the failing four-service contract**

Replace the old five-service assertion with:

```js
assert.equal((html.match(/<article class="service">/g) ?? []).length, 4);
assert.match(html, /Websites &amp; Brand Presence/);
assert.match(html, />Commerce</);
assert.match(html, />Business Systems</);
assert.match(html, />Ongoing Care</);
assert.match(html, /Shopify/);
assert.match(html, /Booking &amp; scheduling/);
assert.doesNotMatch(html, /Signature Websites|Portfolio Websites|Website Redesign|Business Tools &amp; Integrations/);
```

- [ ] **Step 2: Run the tests and confirm the five-service implementation fails**

Run: `npm test`

Expected: FAIL because five service articles and the old service titles still render.

- [ ] **Step 3: Replace `services` with the four approved families**

Keep the existing record shape and numbering `01` through `04`.

- `Websites & Brand Presence`: brand sites, portfolios, redesigns, CMS, multilingual work, and migrations; tags must stay representative rather than exhaustive.
- `Commerce`: Shopify setup and redesign, storefront and product experience, payments, and subscriptions; do not promise headless commerce as a standard deliverable.
- `Business Systems`: booking, scheduling, intake, CRM, payments/deposits, automation, memberships, and multi-tool suites described through operational outcomes.
- `Ongoing Care`: hosting, deployment, monitoring, backups, updates, security-minded maintenance, agreed content support, and optimization.

Rewrite the section heading and note so they reinforce integrated design and technology for owner-led businesses without using `small business` or `local business`.

- [ ] **Step 4: Adjust four-item service layout only if the existing rule produces an uneven desktop result**

Preserve the list-based editorial treatment. Make the smallest CSS change that keeps dividers, spacing, and responsive stacking consistent; do not turn the service list into unrelated card UI.

- [ ] **Step 5: Run the service contract**

Run: `npm test`

Expected: PASS with exactly four services, all four approved titles, representative Shopify and scheduling capabilities, and no old service titles.

- [ ] **Step 6: Commit the service architecture**

```bash
git add app/page.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "Present four integrated digital services"
```

### Task 3: Starting-Point Pricing and Selective Partnership

**Files:**
- Modify: `tests/rendered-html.test.mjs`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: the existing `pricingTiers` array and pricing-section renderer.
- Produces: four pricing cards plus separate Ongoing Care and Ongoing Partnership panels.

- [ ] **Step 1: Write the failing pricing contract**

Update the pricing test to assert:

```js
assert.equal((html.match(/<article class="pricing-card(?: pricing-card-featured)?">/g) ?? []).length, 4);
assert.match(html, /The Essential Website/);
assert.match(html, /Starting from \$1,500/);
assert.match(html, /The Signature Website/);
assert.match(html, /Starting from \$3,500/);
assert.match(html, />Commerce</);
assert.match(html, />Business Systems</);
assert.equal((html.match(/Custom proposal/g) ?? []).length, 2);
assert.match(html, /Starting from \$150\/month/);
assert.match(html, /Ongoing Partnership/);
assert.match(html, /limited availability/i);
assert.doesNotMatch(html, /Optional enhancements|Additional custom page|Priority production timeline/);
```

Also isolate the Commerce and Business Systems `<article>` strings and assert that each contains `Custom proposal` plus tailored-scope language, while neither contains `up to N products`, `included products`, or `unlimited`. Assert that the page still states third-party charges are separate and that no fixed price appears in the Ongoing Partnership panel.

- [ ] **Step 2: Run the tests and confirm the existing pricing fails**

Run: `npm test`

Expected: FAIL on the renamed website tiers, fourth card, two custom proposals, partnership language, and removed add-on menu.

- [ ] **Step 3: Replace the pricing records with four starting points**

Use these names and price labels exactly:

- `The Essential Website` — `Starting from $1,500`
- `The Signature Website` — `Starting from $3,500`
- `Commerce` — `Custom proposal`
- `Business Systems` — `Custom proposal`

Website tiers may keep concrete inclusions. Commerce and Business Systems must use representative capabilities and explicit scope language, not guaranteed quantities or a fixed inclusion list that contradicts proposal-based pricing.

- [ ] **Step 4: Replace Optional Enhancements with Ongoing Partnership**

Keep the Ongoing Care panel and `$150/month` starting point. Replace the itemized enhancements panel with an Ongoing Partnership panel using `Tailored engagement` and `Limited availability`. State that priorities, capacity, response expectations, and scope are agreed before work begins. Do not use `unlimited`, a monthly dollar amount, or language promising an embedded full-time team.

- [ ] **Step 5: Adapt the pricing grid and support layout**

Change the wide-screen pricing grid from three to two columns so four detailed cards remain readable. Preserve one-column mobile behavior. Replace any `.enhancements-panel`/definition-list styles that are no longer used with focused partnership-panel styles, and remove dead selectors.

- [ ] **Step 6: Run the pricing contract**

Run: `npm test`

Expected: PASS with four cards, two proposal labels, public Care pricing, selective Partnership language, separate third-party fee language, and no itemized add-ons.

- [ ] **Step 7: Commit the pricing model**

```bash
git add app/page.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "Expand Northline Studio pricing paths"
```

### Task 4: Process, Studio Story, FAQ, Contact, and Footer

**Files:**
- Modify: `tests/rendered-html.test.mjs`
- Modify: `app/page.tsx`
- Modify: `app/globals.css` only for copy-driven overflow or spacing fixes

**Interfaces:**
- Consumes: existing section IDs `process`, `about`, and `contact`, the `faqs` record shape, and static footer links.
- Produces: broader digital-partner copy while preserving all existing public anchors and the static email contact model.

- [ ] **Step 1: Write the failing lower-page content contract**

Add assertions for:

```js
assert.match(html, />Direction</);
assert.match(html, />Design</);
assert.match(html, />Build</);
assert.match(html, />Launch &amp; Care</);
assert.match(html, /design-led digital studio/i);
assert.match(html, /website, store, or system/i);
assert.match(html, /what you are building or operating/i);
assert.match(html, /new build, an improvement, or ongoing management/i);
assert.match(html, /northlinestudio425@gmail\.com/);
assert.doesNotMatch(html, /mailto:|<form\b/i);
```

Retain the existing prohibited-copy checks for Previous Work, upper-right arrows, placeholder email, and small/local-business language.

- [ ] **Step 2: Run the tests and confirm the previous lower-page copy fails**

Run: `npm test`

Expected: FAIL on the new process names, broader studio story, FAQ scope, and revised inquiry guidance.

- [ ] **Step 3: Update the four process stages**

Keep exactly four ordered items and the existing section ID. Use Direction, Design, Build, and Launch & Care, with each description covering the corresponding responsibilities in the spec. Preserve the present section layout and numbering.

- [ ] **Step 4: Rewrite the About section**

Describe Northline as a design-led digital studio combining boutique attention, visual judgment, technical implementation, deployment, and long-term responsibility. Preserve the direct-collaboration advantage without describing the studio as website-only or using copy that makes limited capacity the main message. Change the decorative caption from `INDEPENDENT DESIGN STUDIO` to `DESIGN-LED DIGITAL STUDIO`.

- [ ] **Step 5: Replace the FAQ copy**

Keep five concise FAQs covering project types, improving an existing website/store/system, timing and scope, post-launch care, and separate third-party fees. Answers must avoid promising a universal delivery duration for commerce or systems work.

- [ ] **Step 6: Update contact guidance without adding interaction logic**

Keep the email as a selectable `<span className="contact-email">northlinestudio425@gmail.com</span>`. Update the introduction and checklist to ask what the visitor is building or operating, what currently exists, what is not working, whether they need a new build/improvement/ongoing management, and relevant goals or timing. Preserve the message that an early idea is enough.

- [ ] **Step 7: Update the footer summary**

Mention websites, commerce, digital systems, and ongoing care. Preserve the brand, essential links, copyright, and back-to-top `SectionLink`. Do not add social placeholders or unavailable channels.

- [ ] **Step 8: Run the content contract**

Run: `npm test`

Expected: PASS for all process, About, FAQ, contact, prohibited-copy, and footer assertions.

- [ ] **Step 9: Commit the lower-page narrative**

```bash
git add app/page.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "Complete Northline Studio service narrative"
```

### Task 5: Navigation, Responsive, and Regression Verification

**Files:**
- Modify: `tests/rendered-html.test.mjs`
- Modify if verification requires a fix: `app/page.tsx`
- Modify if verification requires a fix: `app/globals.css`
- Modify only if link parity is broken: `app/MobileMenu.tsx`
- Preserve unless a reproduced scroll regression requires a fix: `app/SectionLink.tsx`

**Interfaces:**
- Consumes: final homepage markup, section IDs, `navigateToSection`, desktop navigation, and `mobileLinks`.
- Produces: an integration contract proving valid anchors, menu parity, static contact, prohibited-copy absence, and non-overflowing responsive layouts.

- [ ] **Step 1: Add a failing navigation-target consistency test**

In `tests/rendered-html.test.mjs`, extract every internal `href="#..."` from rendered HTML and assert that a matching `id="..."` exists. Read `app/MobileMenu.tsx` and assert that it contains `#services`, `#pricing`, `#process`, `#about`, and `#contact` exactly once each.

Also read `app/SectionLink.tsx` and assert that it:

- calculates an offset from `.site-header`;
- calls `window.scrollTo`;
- uses `window.history.pushState` for hash updates;
- does not write to `document.body.style.overflow` or `document.documentElement.style.overflow`.

- [ ] **Step 2: Run the tests and confirm whether the new integration guard passes**

Run: `npm test`

Expected: PASS if content tasks preserved all anchors and scroll behavior. If it fails, the failure must identify the mismatched target or removed scroll invariant before any fix is made.

- [ ] **Step 3: Fix only the regression reported by Step 2, if any**

Align the mismatched link or target in the owning file. Do not redesign `navigateToSection`; only modify it if Step 2 or the browser test reproduces the original locked-scroll symptom.

- [ ] **Step 4: Run all automated checks**

Run: `npm test`

Expected: PASS with zero failed tests.

Run: `npm run lint`

Expected: exit code 0 with no lint errors.

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 5: Run the local desktop browser test**

Start the local site with `npm run dev` and use the URL printed by the server. At a desktop viewport:

1. Click Services, Pricing, Process, and About in sequence.
2. After each jump, scroll both down and up with normal wheel/trackpad input.
3. Confirm content is not hidden under the fixed header.
4. Confirm scrolling remains available and the URL hash matches the selected section.
5. Confirm no horizontal scrollbar appears.

Expected: every jump lands correctly and normal scrolling continues immediately afterward.

- [ ] **Step 6: Run the local mobile browser test**

At a 390 by 844 viewport:

1. Open the mobile menu and verify all five destinations.
2. Select each destination and verify the menu closes.
3. Confirm long service headings, pricing labels, and `northlinestudio425@gmail.com` wrap within the viewport.
4. Confirm the four-card pricing section stacks in one column.
5. Confirm there is no horizontal page overflow.

Expected: mobile navigation, wrapping, and stacking remain usable with no clipped interactive content.

- [ ] **Step 7: Commit the integration contract and any verified fixes**

```bash
git add tests/rendered-html.test.mjs app/page.tsx app/globals.css app/MobileMenu.tsx app/SectionLink.tsx
git commit -m "Verify homepage navigation and responsive behavior"
```

If only a subset changed, stage only the changed files. Do not create an empty commit.

### Task 6: Push, Deploy, and Verify Production

**Files:**
- No planned source changes.
- Modify only the file responsible for a production-only regression if one is found and reproduced.

**Interfaces:**
- Consumes: verified `main` branch and existing GitHub-to-Vercel deployment.
- Produces: the revised homepage live at `https://nlstudio.io`.

- [ ] **Step 1: Confirm the final branch state before publishing**

Run: `git status --short`

Expected: no output.

Run: `git log -5 --oneline`

Expected: the positioning, service, pricing, narrative, and integration commits are visible.

- [ ] **Step 2: Re-run the release checks from a clean state**

Run: `npm test && npm run lint && git diff --check`

Expected: all tests pass, lint exits 0, and `git diff --check` produces no output.

- [ ] **Step 3: Push `main`**

Run: `git push origin main`

Expected: GitHub accepts the new commits with no non-fast-forward error.

- [ ] **Step 4: Wait for the existing Vercel deployment**

Use the existing Vercel project status or deployment URL. Do not create a new Vercel project or change domain configuration.

Expected: the deployment for the pushed commit reaches Ready and `https://nlstudio.io` serves that revision.

- [ ] **Step 5: Verify the production desktop site**

Open a cache-busted URL such as `https://nlstudio.io/?v=<short-commit>` and verify the hero, three engagement paths, four services, pricing structure, static email, and all desktop section jumps. Repeat the scroll-after-jump check from Task 5.

Expected: production content matches the approved spec and section navigation does not lock scrolling.

- [ ] **Step 6: Verify the production mobile site**

At a mobile viewport, verify the menu, section jumps, stacked pricing, long-copy wrapping, and absence of horizontal overflow.

Expected: the production mobile experience matches the verified local behavior.

- [ ] **Step 7: Report the deployed revision**

Provide the production URL, deployed commit hash, automated-check results, and a concise list of the changed positioning and service areas. If production verification exposes a regression, do not report completion; reproduce it locally, add or update the owning test, fix it, rerun Task 5, and redeploy.
