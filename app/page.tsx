import { mailtoHref } from "./site";
import { pageMetadata } from "./page-metadata";
import { BuildPreview } from "./BuildPreview";

export const metadata = pageMetadata(
  "Northline Studio | Websites, Stores & Business Tools",
  "Websites, online stores, and booking tools for small businesses. Explore Northline demos, website redesigns, search optimization, and ongoing care.",
  "/",
);
const builds = [
  { number: "01", name: "Cedar & Stone", kind: "service" as const, type: "SERVICE BUSINESS WEBSITE", href: "/demos/home-services/index.html", title: "From “what do you do?” to a clear project request.", text: "A home-services website with clear service choices, a service-area selector, and a guided inquiry flow.", features: ["Service discovery", "Mobile inquiry flow", "Request summary"], action: "Try the inquiry demo" },
  { number: "02", name: "Form & Field", kind: "store" as const, type: "COMMERCE INTERFACE", href: "/demos/store/index.html", title: "Give every product a clear path to the bag.", text: "Browse a collection, filter by category, choose a color, and manage a shopping bag. A custom interface demo; no Shopify connection.", features: ["Collection filters", "Product details", "Interactive cart"], action: "Explore the store demo" },
  { number: "03", name: "Daybook", kind: "bookings" as const, type: "BOOKING & SCHEDULING TOOL", href: "/demos/bookings/index.html", title: "A booking for your customer. A schedule for you.", text: "Choose an available time, see it appear in the business view, then try rescheduling or cancelling it.", features: ["Available time slots", "Appointment management", "Conflict checks"], action: "Try the booking demo" },
];
export default function Home() {
  return <main id="top" className="proof-home">
    <section className="home-hero proof-hero" aria-labelledby="home-title">
      <div className="proof-hero-copy">
        <p className="eyebrow"><span /> Independent studio. Practical digital work.</p>
        <h1 id="home-title">Make it easier<br />to choose<br /><em>your business.</em></h1>
        <p className="home-hero-lead">Websites, online stores, and booking tools for small businesses. Help customers understand your services, request a quote, book a time, or find the right product.</p>
        <div className="proof-actions"><a className="button button-primary contact-cta" href={mailtoHref}>Tell us what you need <span aria-hidden="true">↗</span></a><a className="proof-text-link" href="#work">Explore our builds <span aria-hidden="true">↓</span></a></div>
        <div className="proof-hero-foot"><span>New websites & redesigns</span><span>Tools & ongoing support</span></div>
      </div>
      <div className="proof-hero-project"><div className="proof-feature-label"><span>A LOOK AT WHAT WE BUILD</span><span>01 / 03</span></div><a className="proof-feature-preview" href="/demos/home-services/index.html" aria-label="Try Cedar and Stone, our home-services inquiry demo"><BuildPreview kind="service" /><span className="proof-preview-open" aria-hidden="true">↗</span></a><div className="proof-feature-caption"><div><strong>Cedar & Stone</strong><span>Website + guided inquiry</span></div><span className="build-badge">Self-initiated demo</span></div></div>
    </section>
    <section className="proof-work" id="work" aria-labelledby="work-title">
      <div className="proof-section-head"><div><p className="section-kicker">Selected builds</p><h2 id="work-title">See what the next<br /><em>step could look like.</em></h2></div><p>Three self-initiated demos, built by Northline. Explore the pages and try the flows. Each uses sample data.</p></div>
      <div className="proof-build-list">{builds.map(build => <article className={`proof-build build-${build.kind}`} key={build.kind}><a className="proof-build-cover" href={build.href} aria-label={build.action}><BuildPreview kind={build.kind} /><span className="proof-cover-action">{build.action}<span aria-hidden="true">↗</span></span></a><div className="proof-build-copy"><div className="proof-build-meta"><span>{build.number} / {build.type}</span><span className="build-badge">Self-initiated build</span></div><p className="proof-build-name">{build.name}</p><h3>{build.title}</h3><p>{build.text}</p><ul>{build.features.map(feature => <li key={feature}>{feature}</li>)}</ul><a className="proof-text-link" href={build.href}>{build.action}<span aria-hidden="true">→</span></a></div></article>)}</div>
    </section>
    <section className="proof-services" id="services" aria-labelledby="services-title">
      <div className="proof-section-head"><div><p className="section-kicker">Where do you need a hand?</p><h2 id="services-title">Start with the problem<br /><em>you want to solve.</em></h2></div><p>A first website, an overdue redesign, a store, or a process that takes too much time.</p></div>
      <div className="proof-service-grid">
        <article><span className="proof-service-number">01 / WEBSITES</span><h3>“My website doesn’t<br />reflect my business.”</h3><p>Make your services easier to understand, give mobile visitors a clear way to contact you, and bring an outdated site up to date.</p><a href="/websites">Explore websites <span aria-hidden="true">→</span></a></article>
        <article><span className="proof-service-number">02 / COMMERCE</span><h3>“I’m ready to sell<br />my products online.”</h3><p>Shopify stores and redesigns with clear collections, useful product details, and a shopping journey shaped around your catalog.</p><a href="/shopify">Explore Shopify <span aria-hidden="true">→</span></a></article>
        <article><span className="proof-service-number">03 / BUSINESS TOOLS</span><h3>“Too much lives in<br />messages and spreadsheets.”</h3><p>Bring booking requests, schedules, client intake, or repeated data entry into a focused tool built around your process.</p><a href="/tools">Explore business tools <span aria-hidden="true">→</span></a></article>
      </div>
      <div className="proof-search-line"><span className="proof-search-icon" aria-hidden="true">⌕</span><div><h3>Have a website, but not sure people can find it?</h3><p>Review indexing, page structure, and content gaps. Agree on what to fix first.</p></div><a className="proof-text-link" href="/seo">Explore SEO <span aria-hidden="true">→</span></a></div>
    </section>
    <section className="proof-process" aria-labelledby="process-title"><div><p className="section-kicker">Working together</p><h2 id="process-title">Know what’s next.<br /><em>See what’s being built.</em></h2><p>We agree on the work before the build, and make room for feedback along the way.</p><a className="proof-text-link" href="/contact">Talk through your project <span aria-hidden="true">→</span></a></div><ol><li><span>01</span><div><h3>Define the right scope.</h3><p>Share your current site, what isn’t working, and what customers need to do. We agree on pages, features, responsibilities, and a quote.</p></div></li><li><span>02</span><div><h3>Review the design. Try the flow.</h3><p>Work through the page structure and key screens before launch. Feedback stays tied to the agreed goals and scope.</p></div></li><li><span>03</span><div><h3>Launch with a clear handoff.</h3><p>Check the agreed pages and functions, set up the launch, and define how updates and support will be handled.</p></div></li></ol></section>
    <section className="proof-care" aria-labelledby="care-title"><div><p className="section-kicker light">After launch</p><h2 id="care-title">Your site is live.<br /><em>Who looks after it?</em></h2><p>Care covers hosting, monitoring, security and dependency updates, backups, and a defined allowance for content changes.</p><a className="button button-light" href="/care">Explore ongoing care <span aria-hidden="true">→</span></a></div><div className="proof-care-note"><span>CARE / STARTING FROM</span><p>$199<small>/ month</small></p><ul><li>Up to 1 hour of small content changes</li><li>Care Plus available for more changes</li><li>Clear limits and additional-work rates</li></ul><a href="/care#plans">See plans and terms →</a></div></section>
    <section className="proof-faq" aria-labelledby="faq-title"><div><p className="section-kicker">Before we start</p><h2 id="faq-title">A few practical<br /><em>questions.</em></h2></div><div className="proof-faq-list">
      <details><summary>Can you improve my existing website?<span aria-hidden="true">+</span></summary><p>Yes. We can review an outdated site, plan a redesign, or discuss a move from Wix or Squarespace. Existing content, URLs, and any migration work are reviewed as part of the scope.</p></details>
      <details><summary>Are the featured builds client projects?<span aria-hidden="true">+</span></summary><p>These three are self-initiated demos built by Northline, using fictional brands and sample data. They demonstrate page design and working interactions. They are not client commissions or evidence of business results.</p></details>
      <details><summary>What does a website project cost?<span aria-hidden="true">+</span></summary><p>The Essential Website starts at $2,500 for up to 3 custom-designed pages. The Signature Website starts at $3,500 for up to 7. Stores and business tools receive a custom proposal. <a href="/websites#pricing">See website packages and what’s included.</a> Third-party costs are separate.</p></details>
      <details><summary>What should I send to get started?<span aria-hidden="true">+</span></summary><p>Your current website, if you have one, what you want to improve, and any timing or budget constraints. An early idea is enough to start defining the work.</p></details>
    </div></section>
    <section className="proof-invitation" aria-labelledby="invitation-title"><p className="section-kicker">Let’s make the next step clear.</p><h2 id="invitation-title">What’s getting in<br /><em>your business’s way?</em></h2><p>Send your website, your idea, or the task you keep doing by hand. We’ll help define a focused project.</p><a className="button button-primary" href={mailtoHref}>Tell us about your project <span aria-hidden="true">↗</span></a></section>
  </main>;
}

