import type { ReactNode } from "react";
import { mailtoHref } from "./site";

export type ServiceKind = "websites" | "tools" | "shopify" | "seo" | "care";

export function ServiceHero({ kind, eyebrow, title, description, cta = "Start a project" }: { kind: ServiceKind; eyebrow: string; title: ReactNode; description: string; cta?: string }) {
  return (
    <>
      <section className={`service-hero service-${kind}`} id="overview" data-service-section="intro">
        <div className="service-hero-copy"><p className="eyebrow"><span /> {eyebrow}</p><h1>{title}</h1><p className="page-lead">{description}</p><a className="button button-primary contact-cta" href={mailtoHref}>{cta}</a></div>
        <ServiceVisual kind={kind} />
      </section>
      <nav className="service-jumps" aria-label="On this page"><a href="#overview">01 <span>Overview</span></a><a href="#experience">02 <span>In practice</span></a><a href="#scope">03 <span>Scope & details</span></a><a href="#next">04 <span>Next step</span></a></nav>
    </>
  );
}

export function ServiceVisual({ kind }: { kind: ServiceKind }) {
  return (
    <figure className={`service-visual visual-${kind}`}>
      <div className="visual-study" aria-hidden="true">
        <div className="study-topline"><span>NORTHLINE / IN PRACTICE</span><span>DESIGN STUDY</span></div>
        {kind === "websites" ? (
            <div className="study-browser"><div className="study-browser-bar"><i /><i /><i /><span>A considered digital home</span></div><div className="study-web-nav"><b>FORM / FIELD</b><span>Studio &nbsp; Journal &nbsp; Contact</span></div><div className="study-web-content"><div><small>SPACE FOR A NEW PERSPECTIVE</small><strong>Quiet forms.<br /><em>Lasting presence.</em></strong><p>A practice in thoughtful details.</p><span className="study-button">Explore the studio</span></div><img src="/visuals/studio-materials.webp" width={1536} height={1024} alt="" decoding="async" fetchPriority="high" /></div><div className="study-web-bottom"><span>Independent in spirit.</span><span>Considered in every detail.</span></div></div>
        ) : kind === "shopify" ? (
            <div className="study-browser"><div className="study-browser-bar"><i /><i /><i /><span>A thoughtful shopping experience</span></div><div className="study-store-header"><b>THE EVERYDAY EDIT</b><span>Shop &nbsp; Our story &nbsp; Bag</span></div><div className="study-store-photo"><img src="/visuals/ceramic-collection.webp" width={1536} height={1024} alt="" decoding="async" fetchPriority="high" /><div><small>OBJECTS WITH INTENTION</small><strong>A slower kind<br />of everyday.</strong></div></div><div className="study-store-bottom"><span>Considered objects.</span><span>Made for your everyday.</span></div></div>
        ) : kind === "tools" ? (
          <div className="study-workspace"><aside><b>Workspace</b><span className="study-active">Schedule</span><span>Requests</span><span>Clients</span><span>Settings</span></aside><div className="study-workspace-main"><small>YOUR DAY, IN FOCUS</small><strong>A clearer week.</strong><div className="study-week"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><div className="study-appointment appt-one"><b>Consultation</b><small>New booking</small></div><div className="study-appointment appt-two"><b>Project review</b><small>Team meeting</small></div><div className="study-appointment appt-three"><b>Planning</b><small>Time to focus</small></div></div><div className="study-notice"><span>✓</span> A request becomes a clear next step.</div></div></div>
        ) : kind === "seo" ? (
          <div className="study-report"><div className="study-report-top"><span>SEARCH / SITE REVIEW</span><span>Illustrative findings</span></div><strong>A clearer picture.<br /><em>A useful next step.</em></strong><div className="study-report-item"><span>01</span><div><b>Technical foundations</b><small>Can search engines discover the right pages?</small></div><i>Check</i></div><div className="study-report-item"><span>02</span><div><b>Content coverage</b><small>Do your pages answer the right questions?</small></div><i>Explore</i></div><div className="study-report-item"><span>03</span><div><b>Priority actions</b><small>Which improvements should come first?</small></div><i>Plan</i></div><p>Evidence → Priorities → Action</p></div>
        ) : (
          <div className="study-care"><div className="study-care-heading"><span className="study-status-dot" /><b>Care, in the background.</b><span>EXAMPLE VIEW</span></div><div className="study-care-graph"><span>MONITOR / MAINTAIN / IMPROVE</span><svg viewBox="0 0 500 120" role="presentation"><path d="M0 90H500M0 60H500M0 30H500" fill="none" stroke="#344d41" /><path d="M0 80L45 79L70 60L95 68L140 48L180 53L215 32L245 40L280 35L310 20L340 24L380 12L415 18L455 10L500 12" fill="none" stroke="#d9ff72" strokeWidth="3" /></svg></div><div className="study-care-tiles"><div><span>01</span><b>Monitor</b><small>Keep an eye on the essentials.</small></div><div><span>02</span><b>Maintain</b><small>Keep the foundations current.</small></div><div><span>03</span><b>Improve</b><small>Make room for the next change.</small></div></div><p>One less thing on your list.</p></div>
        )}
      </div>
      <figcaption>Illustrative {kind === "seo" ? "report" : kind === "care" ? "dashboard" : "interface"} concept, not client work or live results.</figcaption>
    </figure>
  );
}

export function SectionHeading({ number, label, title, text }: { number: string; label: string; title: ReactNode; text?: string }) {
  return <div className="service-section-heading"><p className="section-kicker">{number} / {label}</p><div><h2>{title}</h2>{text ? <p>{text}</p> : null}</div></div>;
}

export function Outcome({ icon, title, children }: { icon: "shape" | "flow" | "launch"; title: string; children: ReactNode }) {
  return <article className="service-outcome"><div className={`outcome-icon icon-${icon}`} aria-hidden="true"><svg viewBox="0 0 64 64"><path d={icon === "shape" ? "M12 48V20l20-10 20 10v28L32 58 12 48ZM12 20l20 12 20-12M32 32v26" : icon === "flow" ? "M10 16h16v16H10zM38 32h16v16H38zM26 24h20v8M18 32v16h20" : "M32 52V12M16 28l16-16 16 16M12 48v8h40v-8"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg></div><h3>{title}</h3><p>{children}</p></article>;
}

export function ServiceNext({ title, text, label = "Tell us about your project" }: { title: ReactNode; text: string; label?: string }) {
  return <section className="service-close" id="next" data-service-section="next"><p className="section-kicker">04 / A good place to start</p><div><h2>{title}</h2><p>{text}</p><a className="button button-primary" href={mailtoHref}>{label}</a></div><span className="service-close-mark" aria-hidden="true">N.</span></section>;
}
