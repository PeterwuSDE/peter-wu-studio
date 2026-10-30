import { NorthlineLogo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { SectionLink } from "./SectionLink";
import { SiteNav } from "./SiteNav";
import { mailtoHref, siteEmail } from "./site";

export function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export function SiteHeader() {
  return (
    <header className="site-header">
      {/* Plain anchors: this site is a static export, and prefetch from next/link would compete with mobile LCP. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className="brand" href="/" aria-label="Northline Studio, home">
        <NorthlineLogo className="brand-logo" />
        <span className="brand-name">Northline<br />Studio</span>
      </a>
      <SiteNav />
      <a className="header-cta" href={mailtoHref}>Start a project</a>
      <MobileMenu />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className="brand footer-brand" href="/" aria-label="Northline Studio, home">
        <NorthlineLogo className="brand-logo" />
        <span className="brand-name">Northline<br />Studio</span>
      </a>
      <p>Websites, commerce, business tools, and search.<br />Thoughtfully built. Cared for beyond launch.<a className="footer-email" href={mailtoHref}>{siteEmail}</a></p>
      <div className="footer-links">
        <a href="/websites">Websites</a>
        <a href="/tools">Business tools</a>
        <a href="/shopify">Shopify</a>
        <a href="/seo">SEO</a>
        <a href="/care">Care</a>
        <a href="/contact">Contact</a>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Northline Studio</span>
        <span>Designed with care. Built to last.</span>
        <SectionLink href="#top">Back to top ↑</SectionLink>
      </div>
    </footer>
  );
}

export function RelatedLinks({ links }: { links: { href: string; label: string }[] }) {
  return (
    <nav className="related" aria-label="Related pages">
      {links.map((link) => (
        <a key={link.href} href={link.href}>{link.label}</a>
      ))}
    </nav>
  );
}

export function Diagrams({ title, items }: { title: string; items: { src: string; alt: string; caption: string }[] }) {
  return (
    <section className="diagram-section section-pad">
      <h2>{title}</h2>
      <div className="diagram-grid">
        {items.map((item) => (
          <figure key={item.src}>
            {/* Static SVG diagrams. The image optimizer is not part of the static file host. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.src} alt={item.alt} width={640} height={400} loading="lazy" decoding="async" />
            <figcaption>{item.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
