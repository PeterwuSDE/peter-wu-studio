import { Diagrams, JsonLd, RelatedLinks } from "../Chrome";
import { pageMetadata } from "../page-metadata";
import { mailtoHref } from "../site";
import { careServiceJsonLd } from "../structured-data";

export const metadata = pageMetadata(
  "Website Care Plans | Northline Studio",
  "Northline Studio Care from $199/month and Care Plus from $399/month, with hosting, monitoring, updates, and content changes.",
  "/care",
);

const careTiers = [
  {
    name: "Care",
    price: "Starting from $199/month",
    features: [
      "Hosting",
      "Uptime monitoring",
      "Security and dependency updates",
      "Backups",
      "Up to 1 hour of small content changes per month",
    ],
  },
  {
    name: "Care Plus",
    price: "Starting from $399/month",
    features: [
      "Everything in Care",
      "Up to 3 hours of changes per month",
      "Priority response",
      "Monthly site report",
    ],
  },
];

export default function CarePage() {
  return (
    <main id="top">
      <JsonLd data={careServiceJsonLd} />
      <section className="page-intro">
        <p className="eyebrow"><span /> Care</p>
        <h1>Ongoing care.</h1>
        <p className="page-lead">Reliable hosting, maintenance, monitoring, and improvements that keep your digital presence secure and current.</p>
        <a className="button button-primary contact-cta" href={mailtoHref}>Start a project</a>
      </section>

      <section className="pricing-section section-pad" id="plans">
        <div className="pricing-heading">
          <div>
            <p className="section-kicker">Monthly plans</p>
            <h2>Care, kept<br /><em>in bounds.</em></h2>
          </div>
          <p>Two published plans. <a href="/websites">Website builds</a> can lead here, and <a href="/seo">search optimization</a> is quoted separately.</p>
        </div>
        <div className="care-grid">
          {careTiers.map((tier) => (
            <article className="care-tier" key={tier.name}>
              <h3>{tier.name}</h3>
              <p className="pricing-price">{tier.price}</p>
              <h4>Includes</h4>
              <ul>
                {tier.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
            </article>
          ))}
        </div>
        <p className="care-terms">Additional work is billed at $125/hour. Unused hours do not roll over. A 3-month minimum term applies.</p>
        <p className="care-partnership">Tailored ongoing partnerships are available for select clients who need regular design and development capacity.</p>
      </section>

      <Diagrams
        title="At a glance"
        items={[
          {
            src: "/diagrams/care-layers.svg",
            alt: "Abstract diagram of four stacked layers, suggesting hosting, monitoring, updates, and backups.",
            caption: "Care as a stack: hosting, monitoring, updates, and backups.",
          },
          {
            src: "/diagrams/care-monitor.svg",
            alt: "Abstract diagram of a single pulse line across a panel, suggesting uptime monitoring.",
            caption: "Uptime monitoring, kept quiet and continuous.",
          },
          {
            src: "/diagrams/care-month.svg",
            alt: "Abstract diagram of a small month grid with a few marked cells, suggesting a bounded monthly allowance.",
            caption: "A defined monthly allowance. Unused time does not roll over.",
          },
        ]}
      />

      <RelatedLinks
        links={[
          { href: "/websites", label: "Website design and builds" },
          { href: "/seo", label: "Search optimization" },
          { href: "/contact", label: "Contact the studio" },
        ]}
      />
    </main>
  );
}
