import { Diagrams, JsonLd, RelatedLinks } from "../Chrome";
import { pageMetadata } from "../page-metadata";
import { mailtoHref } from "../site";
import { seoServiceJsonLd } from "../structured-data";

export const metadata = pageMetadata(
  "Search Optimization | Northline Studio",
  "An SEO health check, a 90-day launch, and monthly search work from Northline Studio, including Google Maps and AI assistants. Request a quote.",
  "/seo",
);

const checklist = [
  "Core Web Vitals",
  "Indexing",
  "Structured data",
  "Titles and meta descriptions",
  "Internal links",
  "Google Business Profile",
  "Local citations",
];

export default function SeoPage() {
  return (
    <main id="top">
      <JsonLd data={seoServiceJsonLd} />
      <section className="page-intro">
        <p className="eyebrow"><span /> Search</p>
        <h1>Search optimization.</h1>
        <p className="page-lead">An audit, a 90-day launch, and ongoing monthly work for visibility in Google, Google Maps, and AI assistants such as ChatGPT and Gemini.</p>
        <a className="button button-primary contact-cta" href={mailtoHref}>Request a quote</a>
      </section>

      <section className="section-pad offer-block">
        <p className="section-kicker">Health check</p>
        <h2>An SEO audit.</h2>
        <p>An SEO audit is a health check of the current site: how it is indexed, how fast it feels, and whether titles, structure, and the local profile are in place. It is a review, not a ranking promise.</p>
      </section>

      <section className="section-pad offer-block" id="launch">
        <p className="section-kicker">90-day launch</p>
        <h2>A measurable checklist.</h2>
        <p>The 90-day launch works through a set checklist. That list is the measure of the launch. Scope is confirmed before work begins.</p>
        <ul className="scope-list">
          {checklist.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="section-pad offer-block">
        <p className="section-kicker">Monthly</p>
        <h2>Ongoing monthly SEO.</h2>
        <p>After the launch, monthly search work continues: monitoring, fixes, and further improvements as the site and search change. Part of the work is how the site is represented in Google Maps and in AI assistants such as ChatGPT and Gemini.</p>
        <p>Monthly SEO is quoted on request. <a href={mailtoHref}>Request a quote</a> and we will confirm the scope before any work begins. Sites that need a rebuild can start with <a href="/websites">website design</a>. Hosting and updates live with <a href="/care">Care</a>.</p>
      </section>

      <Diagrams
        title="At a glance"
        items={[
          {
            src: "/diagrams/search-check.svg",
            alt: "Abstract diagram of a page beside a short column of check marks, suggesting an SEO health check.",
            caption: "An SEO audit as a health check against a short list.",
          },
          {
            src: "/diagrams/search-checklist.svg",
            alt: "Abstract diagram of seven horizontal steps in a row, suggesting the 90-day launch checklist.",
            caption: "The 90-day launch, measured by a fixed checklist.",
          },
          {
            src: "/diagrams/search-presence.svg",
            alt: "Abstract diagram of a central site connected to three nodes, suggesting search, maps, and AI assistants.",
            caption: "Visibility across search, maps, and AI assistants.",
          },
        ]}
      />

      <RelatedLinks
        links={[
          { href: "/websites", label: "Website design and builds" },
          { href: "/care", label: "Ongoing care" },
          { href: "/contact", label: "Contact the studio" },
        ]}
      />
    </main>
  );
}
