import { JsonLd, RelatedLinks } from "../Chrome";
import { pageMetadata } from "../page-metadata";
import { mailtoHref } from "../site";
import { StudioPreview } from "../StudioPreview";
import { shopifyServiceJsonLd } from "../structured-data";

export const metadata = pageMetadata(
  "Shopify Stores & Commerce | Northline Studio",
  "New Shopify stores and storefront redesigns, with considered product pages, collections, integrations, and launch support from Northline Studio.",
  "/shopify",
);

const areas = [
  { title: "A store with character", text: "An online shop that feels like your brand, with a clear structure and an experience that works across devices.", items: ["New Shopify stores", "Storefront redesigns", "Brand and content presentation"] },
  { title: "Products in the right light", text: "Help visitors understand what you sell and find the details they need to choose with confidence.", items: ["Product and collection pages", "Navigation and discovery", "Mobile shopping experience"] },
  { title: "Ready for the everyday", text: "Connect the store to the practical parts of selling, with the setup and integrations your business needs.", items: ["Payments and subscriptions", "Selected app integrations", "Testing and launch support"] },
];

export default function ShopifyPage() {
  return (
    <main id="top">
      <JsonLd data={shopifyServiceJsonLd} />
      <section className="page-intro specialty-intro">
        <div><p className="eyebrow"><span /> Shopify & commerce</p><h1>Your products.<br />A better place to shine.</h1><p className="page-lead">A new or redesigned Shopify storefront shaped around your products, your brand, and the people buying from you.</p><a className="button button-primary contact-cta" href={mailtoHref}>Discuss your storefront</a></div>
        <div className="specialty-art"><StudioPreview kind="shopify" /><p>Illustrative storefront concept, not a client store.</p></div>
      </section>
      <section className="section-pad offer-block"><p className="section-kicker">Commerce, considered</p><h2>Make the experience<br /><em>part of the product.</em></h2><div className="scope-columns">{areas.map((area) => <article key={area.title}><h3>{area.title}</h3><p>{area.text}</p><ul className="scope-list">{area.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div></section>
      <section className="section-pad offer-block"><p className="section-kicker">The right starting point</p><h2>A build around your business.</h2><p>Whether you are opening a first store or improving an existing one, we define the product catalog, content, customer journey, integrations, and launch requirements together.</p><p>Theme-based stores and custom storefronts are scoped to fit the project. More complex API-driven experiences require their own technical discovery.</p><p className="pricing-price">Custom proposal</p><p>Shopify subscriptions, paid themes, apps, transaction fees, and other third-party costs are separate from Northline’s service fee.</p></section>
      <section className="service-next"><div><h2>Give your store its next chapter.</h2><p>Share your current store or the idea behind it. We will help define the design, scope, and route to launch.</p></div><a className="button button-primary" href={mailtoHref}>Start a commerce project</a></section>
      <RelatedLinks links={[{ href: "/websites", label: "Website design" }, { href: "/tools", label: "Business tools" }, { href: "/seo", label: "Search optimization" }, { href: "/care", label: "Ongoing care" }]} />
    </main>
  );
}
