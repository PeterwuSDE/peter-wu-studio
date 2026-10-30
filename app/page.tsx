import { mailtoHref } from "./site";
import { pageMetadata } from "./page-metadata";

export const metadata = pageMetadata(
  "Northline Studio | Web Design, SEO, Care",
  "Northline Studio web design for people building something of their own, plus search optimization and ongoing site care.",
  "/",
);

const lines = [
  {
    number: "01",
    title: "Websites",
    text: "Distinctive websites, Shopify storefronts, and redesigns for a credible home online.",
    href: "/websites",
    label: "View websites",
  },
  {
    number: "02",
    title: "SEO",
    text: "A health check, a 90-day launch, and monthly search work. Request a quote.",
    href: "/seo",
    label: "View SEO",
  },
  {
    number: "03",
    title: "Care",
    text: "Hosting, monitoring, maintenance, and a defined allowance for content changes.",
    href: "/care",
    label: "View care",
  },
];

export default function Home() {
  return (
    <main id="top">
      <section className="page-intro" id="about">
        <p className="eyebrow"><span /> Design, development and digital systems</p>
        <h1>We bring ambitious ideas to life online.</h1>
        <p className="page-lead">Northline Studio is a web design studio for people building something of their own. We create distinctive websites, commerce experiences, and digital systems, then help them stay findable and cared for.</p>
        <a className="button button-primary contact-cta" href={mailtoHref}>Start a project</a>
      </section>

      <section className="line-grid" id="services" aria-label="Business lines">
        {lines.map((line) => (
          <article className="line-card" key={line.href}>
            <span>{line.number}</span>
            <h2>{line.title}</h2>
            <p>{line.text}</p>
            <a className="text-link" href={line.href}>{line.label}</a>
          </article>
        ))}
      </section>
    </main>
  );
}
