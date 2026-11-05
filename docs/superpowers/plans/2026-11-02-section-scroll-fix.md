# Static section navigation repair

User report: selecting a section makes several pages stop scrolling after the homepage upgrade.

Investigation: service jump links and the homepage work link use native fragments. Browsers dispatch popstate for same-document fragment navigation. Vinext 0.0.50's app-browser-entry popstate handler unconditionally runs dynamic RSC traversal and then restores the hash; this site serves HTML-only static route exports. The older SectionLink workaround is used only for the footer. No document/body overflow lock exists in application code.

Fix: one deferred shared static script handles same-document section clicks with a single offset scroll and pushState; its capture-phase same-document popstate handling prevents the dynamic router from re-fetching and re-following a fragment on this static host. Preserve state, modified clicks, downloads and cross-document navigation. No wheel/touch/scroll listeners or recurring scroll forcing.

Verification: seven Node VM event regression tests cover one-shot jumping and subsequent scroll freedom, absolute homepage fragments, suppression of dynamic same-document traversal, saved scroll restoration, and native cross-page/modified/download behavior. Full production build/static export and 31 tests passed. Every exported marketing page loads the shared script and the file is included in the export. No supported browser automation surface is available; runtime browser verification is not claimed.

Independent review: no blockers in the capture-phase handling. Strengthened tests with a simulated bubble-phase dynamic-router listener and negative cross-document traversal cases. Added passive scrollend snapshotting so supported browsers restore the last manual position on history traversal; this handler never calls scrollTo or prevents input. No continuous scroll/wheel/touch listeners are used.
