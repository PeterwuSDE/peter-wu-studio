import { JsonLd, RelatedLinks } from "../Chrome";
import { pageMetadata } from "../page-metadata";
import { mailtoHref } from "../site";
import { StudioPreview } from "../StudioPreview";
import { toolsServiceJsonLd } from "../structured-data";

export const metadata = pageMetadata(
  "Business Tools & Workflow Systems | Northline Studio",
  "Booking, scheduling, client intake, and practical internal tools. Northline Studio builds business systems around the way you work.",
  "/tools",
);

const areas = [
  { title: "A smoother booking", text: "Give customers a clear way to reserve time, and give your team a schedule they can work with.", items: ["Booking and scheduling", "Client intake", "Payments and deposits"] },
  { title: "Less repetitive work", text: "Connect the steps between an inquiry, a customer, and the work that needs to happen next.", items: ["CRM connections", "Workflow automation", "Connected business tools"] },
  { title: "Your own workspace", text: "A focused internal tool for the information, decisions, and everyday tasks that matter to your team.", items: ["Lightweight client portals", "Internal dashboards", "Tailored multi-tool suites"] },
];

export default function ToolsPage() {
  return (
    <main id="top">
      <JsonLd data={toolsServiceJsonLd} />
      <section className="page-intro specialty-intro">
        <div><p className="eyebrow"><span /> Business tools</p><h1>Less friction.<br />More room to work.</h1><p className="page-lead">Bookings, schedules, client intake, and internal tools shaped around how your business actually operates. Start with the task that takes too much time.</p><a className="button button-primary contact-cta" href={mailtoHref}>Discuss a business tool</a></div>
        <div className="specialty-art"><StudioPreview kind="tools" /><p>Illustrative workspace concept. Each project is scoped around your workflow.</p></div>
      </section>
      <section className="section-pad offer-block"><p className="section-kicker">What we can simplify</p><h2>Practical tools.<br /><em>Specific problems solved.</em></h2><div className="scope-columns">{areas.map((area) => <article key={area.title}><h3>{area.title}</h3><p>{area.text}</p><ul className="scope-list">{area.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div></section>
      <section className="section-pad offer-block"><p className="section-kicker">From workflow to working tool</p><h2>Start with the process.</h2><p>We map the current workflow, identify the useful change, and define a focused first version. Then we design, build, test, and deploy it.</p><p>Scope includes the people who use it, the information it handles, the systems it connects to, and who will manage it after launch.</p><p className="pricing-price">Custom proposal</p><p>Deliverables, timing, integrations, and ongoing responsibilities are agreed before work begins. Third-party subscriptions and services are separate from our project fee.</p></section>
      <section className="service-next"><div><h2>What keeps slowing you down?</h2><p>Tell us how you handle it today and what a better day would look like. An early idea is enough to begin.</p></div><a className="button button-primary" href={mailtoHref}>Describe your workflow</a></section>
      <RelatedLinks links={[{ href: "/websites", label: "Website design" }, { href: "/shopify", label: "Shopify commerce" }, { href: "/seo", label: "Search optimization" }, { href: "/care", label: "Ongoing care" }]} />
    </main>
  );
}
