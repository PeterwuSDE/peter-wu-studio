type PreviewKind = "website" | "tools" | "shopify" | "search";

/** Decorative concept interfaces, not customer work or live product results. */
export function StudioPreview({ kind, compact = false }: { kind: PreviewKind; compact?: boolean }) {
  return (
    <div className={`studio-preview preview-${kind}${compact ? " preview-compact" : ""}`} aria-hidden="true">
      <div className="preview-window">
        <div className="preview-toolbar"><span /><span /><span /><i>northline / {kind}</i></div>
        {kind === "website" ? (
          <div className="preview-web">
            <div className="preview-web-nav"><b>NORTHLINE</b><span>Independent by design.</span></div>
            <div className="preview-web-copy"><small>A NEW PERSPECTIVE</small><strong>Make room<br />for something<br /><em>remarkable.</em></strong><span className="preview-pill">Discover the possibilities</span></div>
            <div className="preview-sculpture"><i /><i /><i /></div>
            <div className="preview-web-foot"><span>Thoughtful design.</span><span>Considered details.</span></div>
          </div>
        ) : kind === "tools" ? (
          <div className="preview-tools">
            <div className="preview-app-nav"><b>Workspace</b><span>Overview</span><span>Schedule</span><span>Clients</span></div>
            <div className="preview-app-main"><small>YOUR DAY, IN FOCUS</small><strong>A little more flow.</strong><div className="preview-calendar"><span>MON</span><span>TUE</span><span>WED</span><i>Consultation</i><i>Project review</i><i>Team planning</i></div><div className="preview-task"><span>✓</span> One place for the next step.</div></div>
          </div>
        ) : kind === "shopify" ? (
          <div className="preview-store"><div className="preview-store-nav"><b>THE EVERYDAY EDIT</b><span>Objects with intention.</span></div><strong>Less, but better.</strong><div className="preview-products"><div><i /><span>Everyday essentials</span></div><div><i /><span>Considered objects</span></div><div><i /><span>New perspectives</span></div></div><span className="preview-store-foot">A considered collection.</span></div>
        ) : (
          <div className="preview-search"><small>SEARCH / A CLEARER PICTURE</small><strong>Find the next<br />opportunity.</strong><div className="preview-search-line"><span>Page structure</span><i /><b>Review</b></div><div className="preview-search-line"><span>Content coverage</span><i /><b>Explore</b></div><div className="preview-search-line"><span>Technical foundations</span><i /><b>Check</b></div><span className="preview-search-note">Understand. Prioritize. Improve.</span></div>
        )}
      </div>
    </div>
  );
}
