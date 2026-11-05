# Proof-led homepage implementation plan

Approved scope: implement the twenty-studio research recommendation: concrete small-business positioning, early self-initiated builds, situation-based services, clear process and support. Add three sample-data demos: service inquiry, commerce browsing/cart, booking/schedule management.

Keep production origin, email, existing service routes, prices and care terms. Use existing React/vinext static export and dependency-free public demos. No real messages, payments, invented customers or business results. The commerce demo is not a Shopify integration.

- [x] Test demo behavior first; implement pure model and accessible browser interactions.
- [x] Build three responsive demo pages and honest previews.
- [x] Rewrite homepage and service introductions; update metadata and integration assertions.
- [x] Run domain tests, static export and existing tests; obtain independent review.
- [ ] Save reviewed changes, integrate through existing GitHub/Vercel deployment and verify status.

Review focus: mobile overflow, keyboard use, empty filters/cart, quantities and money, conflicting bookings, real contact links, demo disclosures.

Execution ledger:
- Source snapshot: upstream 2288c9cb2afb0888aae08f986c8306b448d5d64b; isolated local branch codex/northline-proof-led.
- Prior dependency installation was blocked by network permissions. Previous code drafts were not saved. Work resumes with durable local files.
- This plan records the already approved research proposal; no additional design approval is required.

- npm ci completed with the network permission enabled; no new dependencies were added.
- npm test: production build, static export and both test files passed. Explicit spec runner: 23 tests passed, zero failed.
- Initial rendered suite failure was an incomplete local source snapshot (missing github-pages/index.html); restored original upstream file.
- Independent read-only review: no critical findings. Fixed narrow-cart reflow via bounded columns and wrapping; fixed rescheduling selection recovery with a regression test (7 domain tests total).
- No supported browser control surface is available. Browser pixels and runtime keyboard behavior are not claimed as verified.
- Upstream main advanced to a34d68ef8ad5b9121ca268d94fa20ab9612e47b6 with only a new SEO product design document. Preserve it using that tree as publication base; no SEO-check backend is implemented here.
- Restored binary artwork hashes match upstream exactly and are excluded from the remote change set. Restored build helper and legacy redirect are also unchanged upstream.
