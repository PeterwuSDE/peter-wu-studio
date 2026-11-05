import { JsonLd, RelatedLinks } from "../Chrome";
import { pageMetadata } from "../page-metadata";
import { ServiceHero, SectionHeading, Outcome, ServiceNext } from "../ServicePage";
import { websitesServiceJsonLd } from "../structured-data";

export const metadata = pageMetadata("Website Design and Builds | Northline Studio", "Content sites, Shopify storefronts, and redesigns by Northline Studio. Essential websites from $2,500. Signature websites from $3,500.", "/websites");

const packages = [
  { name: "The Essential Website", price: "$2,500", note: "A focused first chapter.", features: ["Up to 3 custom-designed pages", "Responsive development", "Foundational SEO and accessibility", "Domain and launch configuration"] },
  { name: "The Signature Website", price: "$3,500", note: "More room for your story.", features: ["Up to 7 custom-designed pages", "Deeper content architecture", "Galleries, motion, and selected integrations", "Expanded SEO and launch support"] },
];

export default function WebsitesPage() {
  return <main id="top" className="service-page">
    <JsonLd data={websitesServiceJsonLd} />
    <ServiceHero kind="websites" eyebrow="Websites & modernization" title={<>A better website.<br /><em>A clearer way to contact you.</em></>} description="Show customers what you do, where you work, and how to take the next step. New websites and redesigns with clear service pages, mobile layouts, and an inquiry path built around your business." />
    <section className="service-experience" id="experience" data-service-section="experience">
      <SectionHeading number="02" label="In practice" title={<>From an idea.<br /><em>To a place of your own.</em></>} text="A new build or a redesign, shaped around what your visitors need to see and do." />
      <a className="service-demo-link" href="/demos/home-services/index.html">Try the Cedar &amp; Stone website →<span>Explore services, choose an area, and create a sample request. A self-initiated Northline build.</span></a>
      <div className="outcome-grid" id="builds"><Outcome icon="shape" title="A recognizable identity">Typography, imagery, and content that feel like your business.</Outcome><Outcome icon="flow" title="A clearer journey">Less clutter. Better structure. An obvious next step.</Outcome><Outcome icon="launch" title="A dependable launch">Responsive development, accessibility, and search foundations.</Outcome></div>
      <div className="service-process-strip" id="process"><span>HOW WE GET THERE</span><ol><li><b>01</b><h3>Direction</h3></li><li><b>02</b><h3>Design</h3></li><li><b>03</b><h3>Build</h3></li><li><b>04</b><h3>Launch & Care</h3></li></ol></div>
    </section>
    <section className="service-scope" id="scope" data-service-section="scope">
      <SectionHeading number="03" label="Starting points" title={<>The right size<br /><em>for your next chapter.</em></>} />
      <div className="service-package-grid" id="pricing">{packages.map((plan, i) => <article className={`service-package package-${i}`} key={plan.name}><p className="package-number">0{i + 1} / {plan.note}</p><h3>{plan.name}</h3><p className="package-price"><span>Starting from</span>{plan.price}</p><ul>{plan.features.map(f => <li key={f}>{f}</li>)}</ul></article>)}</div>
      <div className="service-specialties"><a id="shopify" href="/shopify"><span>Selling products?</span>Explore Shopify <i aria-hidden="true">→</i></a><a id="systems" href="/tools"><span>Bookings or internal workflows?</span>Explore business tools <i aria-hidden="true">→</i></a></div>
      <div className="service-details">
        <details><summary>What kind of website can you build?<span aria-hidden="true">+</span></summary><p>We build content-only sites, portfolios, editorial sites, and redesigns. Every engagement is individually scoped around your content and goals.</p></details>
        <details><summary>Can you upgrade an existing site?<span aria-hidden="true">+</span></summary><p>Yes—including migrations from Wix or Squarespace, and rebuilds of slow or outdated websites. We confirm what to keep, what to improve, and how to move existing content.</p></details>
        <details><summary>What happens after launch?<span aria-hidden="true">+</span></summary><p>You can take over the site or choose <a href="/care">Care or Care Plus</a>. Search work is available through <a href="/seo">SEO</a>. Third-party platforms, applications, themes, fonts, subscriptions, and transaction fees are quoted separately.</p></details>
      </div>
    </section>
    <ServiceNext title={<>Your next chapter<br /><em>starts here.</em></>} text="Share your current website or the idea you want to bring online. We will help define a focused next step." />
    <RelatedLinks links={[{ href: "/shopify", label: "Shopify storefronts" }, { href: "/tools", label: "Business tools" }, { href: "/seo", label: "Search optimization" }, { href: "/care", label: "Ongoing care" }]} />
  </main>;
}

