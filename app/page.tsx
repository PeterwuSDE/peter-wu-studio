import { mailtoHref } from "./site";
import { pageMetadata } from "./page-metadata";
import { StudioPreview } from "./StudioPreview";

export const metadata = pageMetadata(
  "Northline Studio | Web Design, SEO, Care",
  "Northline Studio web design for people building something of their own, plus search optimization and ongoing site care.",
  "/",
);

const services = [
  { number: "01", title: "Websites & modernization", text: "A new beginning for your brand, or a better next chapter for your existing website.", href: "/websites", label: "Explore websites", kind: "website" as const, detail: "NEW BUILDS / REDESIGNS / MIGRATIONS" },
  { number: "02", title: "Tools for the way you work", text: "Bookings, schedules, and internal tools built around your business. Less friction, more flow.", href: "/tools", label: "Explore business tools", kind: "tools" as const, detail: "BOOKINGS / WORKFLOWS / INTERNAL TOOLS" },
  { number: "03", title: "Commerce, considered", text: "Shopify storefronts that give your products room to shine and make shopping feel natural.", href: "/shopify", label: "Explore Shopify", kind: "shopify" as const, detail: "STOREFRONTS / COLLECTIONS / INTEGRATIONS" },
  { number: "04", title: "A clearer path to discovery", text: "Understand your search presence, uncover the gaps, and give the right people a better way to find you.", href: "/seo", label: "Explore SEO", kind: "search" as const, detail: "SEO / CONTENT / SEARCH VISIBILITY" },
];

export default function Home() {
  return (
    <main id="top" className="studio-home">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <p className="eyebrow"><span /> Independent digital studio</p>
          <h1 id="home-title">Built to stand out.<br /><em>Made to work.</em></h1>
          <p className="home-hero-lead">Thoughtful websites, Shopify stores, and practical business tools. Northline brings your ideas online—and helps them keep moving.</p>
          <div className="hero-actions"><a className="button button-primary contact-cta" href={mailtoHref}>Start a project</a><a className="home-secondary" href="#services">Find your starting point <span aria-hidden="true">↓</span></a></div>
          <div className="home-hero-note"><span>From the first idea.</span><span>To what comes next.</span></div>
        </div>
        <div className="home-hero-art">
          <div className="home-orbit" aria-hidden="true" />
          <div className="home-art-label"><span>DESIGN WITH INTENT.</span><span>BUILD WITH CARE.</span></div>
          <StudioPreview kind="website" />
          <div className="home-art-tag" aria-hidden="true"><span>01 / THE DETAILS MATTER</span><strong>A stronger first impression.</strong></div>
          <p className="home-art-caption">An illustrative interface study by Northline.</p>
        </div>
      </section>

      <section className="home-services" id="services" aria-labelledby="services-title">
        <div className="home-section-heading"><p className="section-kicker">Find your starting point</p><div><h2 id="services-title">Different needs.<br /><em>One considered approach.</em></h2><p>Start from an idea, improve what you have, or solve something that slows you down.</p></div></div>
        <div className="service-showcase-grid">
          {services.map((service) => (
            <article className={`service-showcase showcase-${service.kind}`} key={service.href}>
              <div className="showcase-topline"><span>{service.number}</span><span>{service.detail}</span></div>
              <div className="showcase-copy"><h3><a href={service.href}>{service.title}</a></h3><p>{service.text}</p></div>
              <StudioPreview kind={service.kind} compact />
              <a className="showcase-link" href={service.href}>{service.label}<span aria-hidden="true">→</span></a>
            </article>
          ))}
        </div>
        <p className="home-study-note">Interface studies illustrate our approach; they are not client case studies.</p>
      </section>

      <section className="home-care" aria-labelledby="care-title">
        <div className="care-orbit" aria-hidden="true"><i /><i /><span>+</span></div>
        <div><p className="section-kicker light">Beyond launch</p><h2 id="care-title">Good work deserves<br /><em>ongoing care.</em></h2><p>Hosting, monitoring, maintenance, and a defined allowance for changes. A dependable next step after your site goes live.</p><a className="button button-light" href="/care">Explore ongoing care</a></div>
        <div className="home-care-list"><span>Hosting & deployment</span><span>Monitoring & maintenance</span><span>Updates & ongoing support</span></div>
      </section>

      <section className="home-invitation" aria-labelledby="invitation-title"><p className="section-kicker">Have something in mind?</p><div><h2 id="invitation-title">Let’s make it<br /><em>something good.</em></h2><p>A rough idea, an outdated website, or a process ready for a rethink. Tell us where you are, and we will help define the next step.</p><a className="button button-primary" href="/contact">Talk to Northline</a></div></section>
    </main>
  );
}
