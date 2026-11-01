import { JsonLd, RelatedLinks } from "../Chrome";
import { pageMetadata } from "../page-metadata";
import { ServiceHero, SectionHeading, ServiceNext } from "../ServicePage";
import { seoServiceJsonLd } from "../structured-data";

export const metadata = pageMetadata("Search Optimization | Northline Studio", "An SEO health check, a 90-day launch, and monthly search work from Northline Studio, including Google Maps and AI assistants. Request a quote.", "/seo");

export default function SeoPage() {
  return <main id="top" className="service-page">
    <JsonLd data={seoServiceJsonLd} />
    <ServiceHero kind="seo" eyebrow="Search optimization" title={<>Be easier<br /><em>to find.</em></>} description="Understand what is holding your website back, choose the improvements that matter, and build a clearer search presence over time." cta="Request a quote" />
    <section className="service-experience" id="experience" data-service-section="experience">
      <SectionHeading number="02" label="A clear way forward" title={<>Understand first.<br /><em>Improve with direction.</em></>} />
      <div className="search-path"><article><span>01 / UNDERSTAND</span><div className="search-symbol symbol-audit" aria-hidden="true"><i /><i /><i /></div><h3>SEO audit</h3><p>A picture of your technical foundations, content, and page structure.</p></article><article id="launch"><span>02 / PRIORITIZE</span><div className="search-symbol symbol-plan" aria-hidden="true"><i /><i /><i /></div><h3>90-day launch</h3><p>A defined checklist and a focused sequence of improvements.</p></article><article><span>03 / KEEP IMPROVING</span><div className="search-symbol symbol-grow" aria-hidden="true"><i /><i /><i /></div><h3>Ongoing monthly SEO</h3><p>Monitoring, fixes, and new opportunities as your website evolves.</p></article></div>
    </section>
    <section className="service-scope" id="scope" data-service-section="scope">
      <SectionHeading number="03" label="What we look at" title={<>Find the gaps.<br /><em>Know the next move.</em></>} text="Scope follows your website and business. A review is not a ranking promise." />
      <div className="service-details">
        <details open><summary>Technical foundations<span aria-hidden="true">+</span></summary><ul><li>Core Web Vitals</li><li>Indexing</li><li>Structured data</li></ul></details>
        <details><summary>Content and page structure<span aria-hidden="true">+</span></summary><ul><li>Titles and meta descriptions</li><li>Internal links</li><li>Clear service information and content gaps</li></ul></details>
        <details><summary>Search, maps, and AI visibility<span aria-hidden="true">+</span></summary><p>Google search, Google Maps, Google Business Profile, and Local citations where relevant. We also consider how a business is represented in AI assistants such as ChatGPT and Gemini.</p></details>
      </div><p className="service-smallprint">Monthly work is scoped and quoted individually. Website changes and ongoing search results are reviewed against the agreed work and available evidence.</p>
    </section>
    <ServiceNext title={<>Start with<br /><em>a clearer picture.</em></>} text="Send your website and what you want it to achieve. We will confirm the review scope and the right next step." label="Request a quote" />
    <RelatedLinks links={[{ href: "/websites", label: "Website design" }, { href: "/tools", label: "Business tools" }, { href: "/care", label: "Ongoing care" }]} />
  </main>;
}
