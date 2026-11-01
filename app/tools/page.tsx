import { JsonLd, RelatedLinks } from "../Chrome";
import { pageMetadata } from "../page-metadata";
import { ServiceHero, SectionHeading, ServiceNext } from "../ServicePage";
import { toolsServiceJsonLd } from "../structured-data";

export const metadata = pageMetadata("Business Tools & Workflow Systems | Northline Studio", "Booking, scheduling, client intake, and practical internal tools. Northline Studio builds business systems around the way you work.", "/tools");

export default function ToolsPage() {
  return <main id="top" className="service-page">
    <JsonLd data={toolsServiceJsonLd} />
    <ServiceHero kind="tools" eyebrow="Business tools" title={<>Less friction.<br /><em>More room to work.</em></>} description="Booking, scheduling, and internal tools built around the way your business works. Start with the task that keeps slowing you down." cta="Discuss a business tool" />
    <section className="service-experience" id="experience" data-service-section="experience">
      <SectionHeading number="02" label="A smoother day" title={<>Fewer loose ends.<br /><em>A clearer next step.</em></>} />
      <div className="workflow-visual" aria-label="Example workflow: request, schedule, shared workspace"><div><span>01 / INTAKE</span><strong>A request<br />comes in.</strong><small>Capture what matters.</small></div><i aria-hidden="true">→</i><div><span>02 / COORDINATE</span><strong>The right time.<br />The right person.</strong><small>Keep the next step clear.</small></div><i aria-hidden="true">→</i><div><span>03 / FOLLOW THROUGH</span><strong>One shared<br />workspace.</strong><small>Bring the details together.</small></div></div>
      <div className="service-caption-row"><p>Illustrative workflow. Your process defines the tool.</p><span>DESIGNED AROUND THE EVERYDAY</span></div>
    </section>
    <section className="service-scope scope-with-aside" id="scope" data-service-section="scope">
      <SectionHeading number="03" label="What we can build" title={<>A focused tool.<br /><em>A useful difference.</em></>} text="We map your current process, agree a practical first version, then design, build, and deploy it." />
      <div className="scope-detail-layout"><div className="service-details">
        <details open><summary>Booking and scheduling<span aria-hidden="true">+</span></summary><p>Bookings, team schedules, Client intake, and Payments and deposits—connected around a clear customer journey.</p></details>
        <details><summary>Workflow automation<span aria-hidden="true">+</span></summary><p>CRM connections, request routing, onboarding, and Connected business tools. Less repeated entry between the systems you already use.</p></details>
        <details><summary>Internal workspaces<span aria-hidden="true">+</span></summary><p>Lightweight client portals, internal dashboards, and Tailored multi-tool suites. Scope follows your users, data, and operational needs.</p></details>
      </div><aside className="scope-note"><span>THE STARTING POINT</span><h3>Custom proposal</h3><p>Scope, integrations, timing, and ongoing responsibilities agreed before the build.</p><small>Third-party subscriptions and services are separate.</small></aside></div>
    </section>
    <ServiceNext title={<>Tell us what<br /><em>takes too much time.</em></>} text="A description of today's workflow is enough. We will help identify where a small, well-designed tool could make a difference." label="Describe your workflow" />
    <RelatedLinks links={[{ href: "/websites", label: "Website design" }, { href: "/shopify", label: "Shopify commerce" }, { href: "/seo", label: "Search optimization" }, { href: "/care", label: "Ongoing care" }]} />
  </main>;
}
