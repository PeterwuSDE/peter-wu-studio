import { JsonLd, RelatedLinks } from "../Chrome";
import { pageMetadata } from "../page-metadata";
import { ServiceHero, SectionHeading, Outcome, ServiceNext } from "../ServicePage";
import { shopifyServiceJsonLd } from "../structured-data";

export const metadata = pageMetadata("Shopify Stores & Commerce | Northline Studio", "New Shopify stores and storefront redesigns, with considered product pages, collections, integrations, and launch support from Northline Studio.", "/shopify");

export default function ShopifyPage() {
  return <main id="top" className="service-page">
    <JsonLd data={shopifyServiceJsonLd} />
    <ServiceHero kind="shopify" eyebrow="Shopify & commerce" title={<>Your products.<br /><em>Room to shine.</em></>} description="A new or redesigned Shopify store that feels like your brand and makes the path from discovery to purchase feel natural." cta="Discuss your storefront" />
    <section className="service-experience" id="experience" data-service-section="experience">
      <SectionHeading number="02" label="The shopping experience" title={<>Considered from<br /><em>first look to checkout.</em></>} />
      <div className="outcome-grid"><Outcome icon="shape" title="A store with character">Design and imagery that give your products a recognizable home.</Outcome><Outcome icon="flow" title="An easier way to explore">Clear collections, useful product details, and thoughtful mobile navigation.</Outcome><Outcome icon="launch" title="Ready to open">The practical setup, selected integrations, and launch checks your store needs.</Outcome></div>
    </section>
    <section className="service-scope" id="scope" data-service-section="scope">
      <SectionHeading number="03" label="Shaped around your store" title={<>A first store.<br /><em>Or a fresh perspective.</em></>} />
      <div className="scope-detail-layout"><div className="service-details">
        <details open><summary>Store design and product presentation<span aria-hidden="true">+</span></summary><p>New Shopify stores, storefront redesigns, Product and collection pages, brand presentation, and the Mobile shopping experience.</p></details>
        <details><summary>Setup and integrations<span aria-hidden="true">+</span></summary><p>Payments and subscriptions, selected apps, Testing and launch support. Theme-based stores and custom storefronts are scoped to fit the business.</p></details>
        <details><summary>What defines the final scope?<span aria-hidden="true">+</span></summary><p>Your catalog, content, customer journey, integrations, and migration needs. API-driven storefronts require their own technical discovery.</p></details>
      </div><aside className="scope-note"><span>THE STARTING POINT</span><h3>Custom proposal</h3><p>A defined scope and launch plan around your products and priorities.</p><small>Third-party costs—Shopify subscriptions, paid themes, apps, and transaction fees—are separate.</small></aside></div>
    </section>
    <ServiceNext title={<>Give your store<br /><em>its next chapter.</em></>} text="Share your current store or what you plan to sell. We will help shape the experience and the route to launch." label="Start a commerce project" />
    <RelatedLinks links={[{ href: "/websites", label: "Website design" }, { href: "/tools", label: "Business tools" }, { href: "/seo", label: "Search optimization" }, { href: "/care", label: "Ongoing care" }]} />
  </main>;
}
