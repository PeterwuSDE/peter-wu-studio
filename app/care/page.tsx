import { JsonLd, RelatedLinks } from "../Chrome";
import { pageMetadata } from "../page-metadata";
import { ServiceHero, SectionHeading, Outcome, ServiceNext } from "../ServicePage";
import { careServiceJsonLd } from "../structured-data";

export const metadata = pageMetadata("Website Care Plans | Northline Studio", "Northline Studio Care from $199/month and Care Plus from $399/month, with hosting, monitoring, updates, and content changes.", "/care");

const plans = [
  { name: "Care", price: "$199", note: "The everyday essentials.", items: ["Hosting", "Uptime monitoring", "Security and dependency updates", "Backups", "Up to 1 hour of small content changes per month"] },
  { name: "Care Plus", price: "$399", note: "A little more room to evolve.", items: ["Everything in Care", "Up to 3 hours of changes per month", "Priority response", "Monthly site report"] },
];

export default function CarePage() {
  return <main id="top" className="service-page">
    <JsonLd data={careServiceJsonLd} />
    <ServiceHero kind="care" eyebrow="Ongoing care" title={<>Less to manage.<br /><em>More room to grow.</em></>} description="Hosting, monitoring, maintenance, and a defined allowance for changes. Dependable support for the chapter after launch." cta="Discuss ongoing care" />
    <section className="service-experience" id="experience" data-service-section="experience">
      <SectionHeading number="02" label="Beyond launch" title={<>Keep the foundations<br /><em>in good hands.</em></>} />
      <div className="outcome-grid"><Outcome icon="shape" title="Keep it running">Hosting and monitoring around the essentials of your site.</Outcome><Outcome icon="flow" title="Keep it current">Updates, backups, and maintenance with clear responsibilities.</Outcome><Outcome icon="launch" title="Keep it moving">A defined monthly allowance for the changes you need.</Outcome></div>
    </section>
    <section className="service-scope" id="scope" data-service-section="scope">
      <SectionHeading number="03" label="Monthly plans" title={<>Choose your<br /><em>level of care.</em></>} />
      <div className="service-package-grid" id="plans">{plans.map((plan,i) => <article className={`service-package package-${i}`} key={plan.name}><p className="package-number">0{i+1} / {plan.note}</p><h3>{plan.name}</h3><p className="package-price"><span>Starting from</span>{plan.price}<small>/ month</small></p><ul>{plan.items.map(item => <li key={item}>{item}</li>)}</ul></article>)}</div>
      <p className="care-terms service-smallprint">Additional work is billed at $125/hour. Unused hours do not roll over. A 3-month minimum term applies.</p>
      <div className="service-details"><details><summary>Need regular design and development capacity?<span aria-hidden="true">+</span></summary><p>Tailored ongoing partnerships are available for select clients who need regular design and development capacity.</p><p>Search optimization is scoped separately through <a href="/seo">SEO</a>.</p></details></div>
    </section>
    <ServiceNext title={<>A thoughtful launch.<br /><em>A dependable next step.</em></>} text="Tell us about your website, how it is hosted, and the support you need. We will help define the right fit." label="Discuss ongoing care" />
    <RelatedLinks links={[{ href: "/websites", label: "Website design" }, { href: "/seo", label: "Search optimization" }, { href: "/contact", label: "Contact the studio" }]} />
  </main>;
}
