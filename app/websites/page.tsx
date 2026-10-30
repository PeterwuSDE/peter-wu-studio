import { Diagrams, JsonLd, RelatedLinks } from "../Chrome";
import { pageMetadata } from "../page-metadata";
import { mailtoHref } from "../site";
import { websitesServiceJsonLd } from "../structured-data";

export const metadata = pageMetadata(
  "Website Design and Builds | Northline Studio",
  "Content sites, Shopify storefronts, and redesigns by Northline Studio. Essential websites from $2,500. Signature websites from $3,500.",
  "/websites",
);

const builds = [
  {
    number: "01",
    title: "Content sites",
    text: "Content-only and static sites for personal brands and businesses. A focused set of custom pages for the work, the offer, and a way to get in touch.",
    tags: ["Custom websites", "Portfolios and editorial", "Static sites"],
  },
  {
    number: "02",
    title: "Shopify storefronts",
    text: "Considered Shopify experiences designed to present products clearly and make buying feel effortless.",
    tags: ["Shopify stores", "Storefront redesign", "Payments and subscriptions"],
  },
  {
    number: "03",
    title: "Redesign and migration",
    text: "We can redesign, restructure, or extend an existing website, store, or system while preserving what still works. That includes moving off Wix or Squarespace, and rebuilding a site that has become slow or outdated.",
    tags: ["Redesigns and migrations", "Wix and Squarespace", "Slow or outdated sites"],
  },
];

const pricingTiers = [
  {
    number: "01",
    name: "The Essential Website",
    price: "Starting from $2,500",
    description: "A focused digital home for an independent professional, emerging brand, or service-led venture.",
    features: [
      "Up to 3 custom-designed pages",
      "Responsive development",
      "Foundational SEO and accessibility",
      "Domain and launch configuration",
    ],
  },
  {
    number: "02",
    name: "The Signature Website",
    price: "Starting from $3,500",
    description: "A more complete digital presence with greater room for content, storytelling, and refined interaction.",
    featured: true,
    features: [
      "Up to 7 custom-designed pages",
      "Deeper content architecture",
      "Galleries, motion, and selected integrations",
      "Expanded SEO and launch support",
    ],
  },
];

const faqs = [
  {
    question: "What kind of projects do you take on?",
    answer: "We design and build websites, including Shopify storefronts and business systems, and we offer search optimization and ongoing care. The best fit is someone who values thoughtful design, dependable execution, and a clear working relationship.",
  },
  {
    question: "Can you improve something that already exists?",
    answer: "Yes. We can redesign, restructure, optimize, or extend an existing website, store, or digital system while preserving what still works.",
  },
  {
    question: "What happens after launch?",
    answer: "You can take over the finished work or continue with Care or Care Plus for hosting, monitoring, maintenance, and a defined number of content changes each month.",
  },
];

export default function WebsitesPage() {
  return (
    <main id="top">
      <JsonLd data={websitesServiceJsonLd} />
      <section className="page-intro">
        <p className="eyebrow"><span /> Websites</p>
        <h1>Website design and builds.</h1>
        <p className="page-lead">We design and build content-only sites, Shopify storefronts, and redesigns, including moves off Wix or Squarespace and rebuilds of slow or outdated sites.</p>
        <a className="button button-primary contact-cta" href={mailtoHref}>Start a project</a>
      </section>

      <section className="services-section section-pad" id="builds">
        <div className="services-heading">
          <p className="section-kicker">What we build</p>
          <h2>A credible home<br /><em>online.</em></h2>
        </div>
        <div className="service-list">
          {builds.map((build) => (
            <article className="service" key={build.title}>
              <span className="service-number">{build.number}</span>
              <h3>{build.title}</h3>
              <p>{build.text}</p>
              <ul>
                {build.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            </article>
          ))}
        </div>
        <p className="services-note">Every engagement is individually scoped, with deliverables, timing, and investment defined before work begins.</p>
      </section>

      <section className="pricing-section section-pad" id="pricing">
        <div className="pricing-heading">
          <div>
            <p className="section-kicker">Investment</p>
            <h2>Clear starting points.<br /><em>Thoughtfully tailored.</em></h2>
          </div>
          <p>Choose the closest starting point. We will shape the final scope around your identity, content, and technical requirements. <a href="/seo">Search optimization</a> is scoped on its own, and <a href="/care">ongoing care</a> can follow launch.</p>
        </div>
        <div className="pricing-grid">
          {pricingTiers.map((tier) => (
            <article className={`pricing-card${tier.featured ? " pricing-card-featured" : ""}`} key={tier.name}>
              <div className="pricing-card-topline"><span>{tier.number}</span>{tier.featured ? <small>Most popular</small> : null}</div>
              <h3>{tier.name}</h3>
              <p className="pricing-price">{tier.price}</p>
              <p className="pricing-description">{tier.description}</p>
              <h4>Includes</h4>
              <ul>
                {tier.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
            </article>
          ))}
        </div>
        <p className="pricing-terms">Third-party platforms, applications, themes, fonts, subscriptions, and transaction fees are quoted separately when applicable.</p>
      </section>

      <section className="section-pad offer-block" id="shopify">
        <p className="section-kicker">Shopify</p>
        <h2>Commerce, considered.</h2>
        <p>A new or redesigned Shopify storefront shaped around your products and customer journey.</p>
        <p className="pricing-price">Custom proposal</p>
        <h3>Possible scope</h3>
        <ul className="scope-list">
          <li>Store setup or redesign</li>
          <li>Product and collection experience</li>
          <li>Payments and subscriptions</li>
          <li>Testing and launch support</li>
        </ul>
      </section>

      <section className="section-pad offer-block" id="systems">
        <p className="section-kicker">Business systems</p>
        <h2>Business Systems</h2>
        <p>Practical digital systems that simplify bookings, client intake, payments, communication, and everyday operations. A tailored digital system built around a clear operational need.</p>
        <ul className="tag-list">
          <li>Booking & scheduling</li>
          <li>CRM & automation</li>
          <li>Multi-tool suites</li>
        </ul>
        <p className="pricing-price">Custom proposal</p>
        <h3>Possible scope</h3>
        <ul className="scope-list">
          <li>Booking and client intake</li>
          <li>Payments and deposits</li>
          <li>CRM and automation</li>
          <li>Connected business tools</li>
        </ul>
      </section>

      <section className="process-section section-pad" id="process">
        <div className="process-intro">
          <p className="section-kicker light">Our process</p>
          <h2>From direction<br />to <em>dependable delivery.</em></h2>
        </div>
        <ol className="process-list">
          <li><span>01</span><div><h3>Direction</h3><p>We define the goals, audience, content, requirements, and measures of success.</p></div></li>
          <li><span>02</span><div><h3>Design</h3><p>We shape the structure, visual language, and experience into one clear direction.</p></div></li>
          <li><span>03</span><div><h3>Build</h3><p>We implement, integrate, test, and refine the approved solution.</p></div></li>
          <li><span>04</span><div><h3>Launch & Care</h3><p>We deploy the finished work and establish ongoing support when needed.</p></div></li>
        </ol>
      </section>

      <section className="faq-section section-pad">
        <div className="faq-heading"><p className="section-kicker">Good to know</p><h2>Before we<br /><em>begin.</em></h2></div>
        <div className="faq-list">
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}<span>+</span></summary>
              <p>
                {faq.question === "What happens after launch?" ? (
                  <>
                    You can take over the finished work or continue with <a href="/care">Care or Care Plus</a> for hosting, monitoring, maintenance, and a defined number of content changes each month.
                  </>
                ) : faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <Diagrams
        title="At a glance"
        items={[
          {
            src: "/diagrams/content-site.svg",
            alt: "Abstract diagram of a short website: a text column, a color block, and a button, on a warm paper background.",
            caption: "A content site, reduced to pages, type, and one clear next step.",
          },
          {
            src: "/diagrams/storefront.svg",
            alt: "Abstract diagram of a storefront grid: four product tiles and a simple header bar, with no brand names.",
            caption: "A Shopify storefront as a clear grid of products.",
          },
          {
            src: "/diagrams/migration.svg",
            alt: "Abstract diagram of a dense, uneven layout transforming into an orderly page structure.",
            caption: "A redesign and migration, from a crowded site to a clearer structure.",
          },
        ]}
      />

      <RelatedLinks
        links={[
          { href: "/seo", label: "Search optimization" },
          { href: "/care", label: "Ongoing care" },
          { href: "/contact", label: "Contact the studio" },
        ]}
      />
    </main>
  );
}
