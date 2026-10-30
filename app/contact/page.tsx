import { RelatedLinks } from "../Chrome";
import { pageMetadata } from "../page-metadata";
import { mailtoHref, siteEmail } from "../site";

export const metadata = pageMetadata(
  "Contact Northline Studio",
  "Email northlinestudio425@gmail.com about a website, search work, or ongoing care. An early idea is enough to start.",
  "/contact",
);

export default function ContactPage() {
  return (
    <main id="top">
      <section className="contact-section contact-page">
        <div className="contact-star" aria-hidden="true">✦</div>
        <p className="section-kicker light">Have something in mind?</p>
        <h1>Build it well.<br /><em>Run it with confidence.</em></h1>
        <p>For new projects, improvements, or ongoing support, email us directly.</p>
        <a className="button button-primary contact-cta" href={mailtoHref}>Email the studio</a>
        <div className="contact-details">
          <span className="contact-label">Project inquiries</span>
          <a className="contact-email" href={mailtoHref}>{siteEmail}</a>
        </div>
        <div className="contact-brief">
          <h2>A thoughtful introduction.</h2>
          <p>To help us understand your project, include a few details in your email:</p>
          <ul>
            <li>Your name or brand</li>
            <li>Your current website, store, or system, if one exists</li>
            <li>What you want to build or improve</li>
            <li>Your goals, timing, and any useful context</li>
          </ul>
          <p className="contact-brief-note">An early idea is enough. We can shape the details together.</p>
        </div>
        <small>Selective new projects now open</small>
      </section>
      <RelatedLinks
        links={[
          { href: "/websites", label: "Website design and builds" },
          { href: "/seo", label: "Search optimization" },
          { href: "/care", label: "Ongoing care" },
        ]}
      />
    </main>
  );
}
