import { MobileMenu } from "./MobileMenu";
import { SectionLink } from "./SectionLink";

const services = [
  {
    number: "01",
    title: "Websites & Brand Presence",
    text: "Distinctive, carefully built websites that give your work, idea, or organization a credible and memorable home online.",
    tags: ["Custom websites", "Portfolios & editorial", "Redesigns & migrations"],
  },
  {
    number: "02",
    title: "Commerce",
    text: "Considered Shopify experiences designed to present products clearly and make buying feel effortless.",
    tags: ["Shopify stores", "Storefront redesign", "Payments & subscriptions"],
  },
  {
    number: "03",
    title: "Business Systems",
    text: "Practical digital systems that simplify bookings, client intake, payments, communication, and everyday operations.",
    tags: ["Booking & scheduling", "CRM & automation", "Multi-tool suites"],
  },
  {
    number: "04",
    title: "Ongoing Care",
    text: "Reliable hosting, maintenance, monitoring, and improvements that keep your digital presence secure and current.",
    tags: ["Hosting & deployment", "Monitoring & maintenance", "Content & optimization"],
  },
];

const pricingTiers = [
  {
    number: "01",
    name: "The Essential Website",
    price: "Starting from $1,500",
    description: "A focused digital home for an independent professional, emerging brand, or service-led venture.",
    features: [
      "Up to 3 custom-designed pages",
      "Responsive development",
      "Foundational SEO and accessibility",
      "Domain and launch configuration",
    ],
  },
  {
    number: "02",
    name: "The Signature Website",
    price: "Starting from $3,500",
    description: "A more complete digital presence with greater room for content, storytelling, and refined interaction.",
    featured: true,
    features: [
      "Up to 7 custom-designed pages",
      "Deeper content architecture",
      "Galleries, motion, and selected integrations",
      "Expanded SEO and launch support",
    ],
  },
  {
    number: "03",
    name: "Commerce",
    price: "Custom proposal",
    description: "A new or redesigned Shopify storefront shaped around your products and customer journey.",
    featureLabel: "Possible scope",
    features: [
      "Store setup or redesign",
      "Product and collection experience",
      "Payments and subscriptions",
      "Testing and launch support",
    ],
  },
  {
    number: "04",
    name: "Business Systems",
    price: "Custom proposal",
    description: "A tailored digital system built around a clear operational need.",
    featureLabel: "Possible scope",
    features: [
      "Booking and client intake",
      "Payments and deposits",
      "CRM and automation",
      "Connected business tools",
    ],
  },
];

const faqs = [
  {
    question: "What kind of projects do you take on?",
    answer: "We work across websites and brand presence, commerce, digital systems, and ongoing care. The best fit is someone who values thoughtful design, dependable execution, and a clear working relationship.",
  },
  {
    question: "Can you improve something that already exists?",
    answer: "Yes. We can redesign, restructure, optimize, or extend an existing website, store, or digital system while preserving what still works.",
  },
  {
    question: "What happens after launch?",
    answer: "You can take over the finished work or continue with Ongoing Care for hosting, monitoring, maintenance, content support, and future improvements.",
  },
];

function NorthlineLogo({ className = "" }: { className?: string }) {
  return (
    <svg className={`northline-logo ${className}`} viewBox="0 0 100 100" role="img" aria-label="北境 logo">
      <circle className="northline-logo-ring" cx="50" cy="50" r="46" />
      <g className="northline-logo-glyph northline-logo-north" transform="translate(35 36) scale(.0275 -.0275) translate(-494 -356.5)">
        <path d="M595 -20Q546 -4 540 46Q535 99 535 141L536 184V221L538 621Q540 671 529 716Q521 747 509 767L505 776L517 786L545 761L612 703Q619 697 619 693Q619 689 616 683Q605 659 603 630L595 444L593 382V371L616 386Q687 436 734 492Q746 506 755 519Q769 541 769 565Q769 575 768 580L783 587L845 507Q848 503 850.5 498Q853 493 852 487L840 481L818 468Q733 407 677 378L606 341L592 335V328L590 100Q590 88 591 76.5Q592 65 593 53Q596 33 617 28Q650 19 696 19Q757 19 797 30L821 39Q846 50 856 83Q868 121 873 167L882 243L883 248H898L899 245L903 155L912 60L919 21Q920 18 920 12Q920 0 904 -7L868 -20Q808 -35 755 -35H680Q637 -34 595 -20ZM330 -4Q338 28 340 58.5Q342 89 343 144V147L334 142L152 30L143 25Q136 22 132 26Q101 44 68 71L70 81L96 89Q126 96 140 103Q187 119 233.5 139Q280 159 340 189L345 192L348 411Q277 403 229 395.5Q181 388 134 373L69 419L72 429H81Q136 429 164 431Q241 437 286 450Q305 454 321 466Q328 464 334.5 457.5Q341 451 347 445V459L345 617Q343 684 327 728Q322 743 308 771L316 781L320 778L410 702L418 695Q423 688 420 681Q412 659 410 622L405 509L402 394L397 144L396 -54V-64L384 -73L333 -20Q327 -14 330 -4Z" />
      </g>
      <g className="northline-logo-glyph northline-logo-south" transform="translate(65 65) scale(.0275 -.0275) translate(-480.5 -344.5)">
        <path d="M277 -76 345 -42Q409 -7 446 37Q493 92 503 158L504 169L486 168Q485 162 486 156Q487 150 487 145Q487 136 483 131Q476 132 457.5 144Q439 156 429 167L431 174Q433 181 434.5 187Q436 193 437 200V231Q437 312 426 367L414 406Q413 409 413.5 411.5Q414 414 417 416L474 385L538 390L621 399L685 407Q717 412 739 434Q753 429 782 409Q811 389 816 381L811 374Q794 357 789 328L777 245L771 188L763 159Q760 147 742 136Q738 134 736 134Q732 134 727 140L720 152L702 182L648 179L647 177L667 163Q680 156 681 154Q689 149 685 142Q680 130 678 114.5Q676 99 676 85L674 8L675 -14Q676 -31 694 -35Q724 -42 745 -42Q783 -42 822 -31Q848 -23 859 -1Q876 32 880 68L891 142L893 152L907 151L910 110L920 -16Q920 -22 921.5 -28Q923 -34 924 -39V-46Q924 -64 908 -69Q882 -79 859 -83Q817 -92 776 -92Q722 -92 674 -79Q650 -73 639 -60Q628 -47 627 -22Q625 -1 625 40V127L622 178Q581 177 527 170L544 153Q558 139 564 131L562 125Q555 112 547.5 99Q540 86 532 74Q483 -7 403 -49Q353 -77 286 -97ZM106 81Q99 81 94 86L37 126L39 132Q127 152 219 188V417Q179 411 101 395L51 430Q50 436 57 436L85 440L207 456L218 458V468L214 626Q213 685 185 742L183 746L191 755Q217 737 243 716.5Q269 696 289 676Q281 650 279 637Q276 621 276 602L271 491L270 467Q296 471 311 475.5Q326 480 340 492Q351 483 363 474Q375 465 382 456Q386 452 386 447Q386 440 375 438L323 432L269 424L267 206Q318 223 410 261L419 240L251 154L118 84Q112 81 106 81ZM501 202 580 210Q606 211 633 216Q660 219 682 231L721 202Q726 219 731 285.5Q736 352 733 368Q651 364 480 348L482 294H506L533 297Q546 298 559 299.5Q572 301 585 303Q622 308 638.5 311.5Q655 315 673 327L704 297Q712 291 710 284Q705 277 694 277L512 262L482 258L484 202ZM422 440Q419 440 414 443L379 470Q373 474 376 480L516 487Q497 536 468 589L476 597L485 592L538 552Q553 543 553 529Q553 524 550 516L542 489L628 495Q646 523 662 562.5Q678 602 676 623L625 619L531 610L431 597H426Q416 597 410 602L371 631L373 638Q454 640 618 656Q599 686 576.5 712Q554 738 515 774L518 786L596 760L639 743Q655 736 653 720L649 684Q647 667 638 660Q674 661 719 670Q761 678 797 695Q826 677 847 655Q855 647 853 640Q847 631 834 631L706 624L701 623L724 595L732 586Q737 579 737 576Q737 572 731 566L674 503L670 499L711 503L802 516Q839 523 865 537L900 511L918 494L923 485L924 481Q924 477 917 473L904 471L750 467L605 458L568 455Q550 454 532 452.5Q514 451 496 449L426 441Z" />
      </g>
    </svg>
  );
}

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <SectionLink className="brand" href="#top" aria-label="Northline Studio, home">
          <NorthlineLogo className="brand-logo" />
          <span className="brand-name">Northline<br />Studio</span>
        </SectionLink>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <SectionLink href="#services">Services</SectionLink>
          <SectionLink href="#pricing">Pricing</SectionLink>
          <SectionLink href="#process">Process</SectionLink>
          <SectionLink href="#about">About</SectionLink>
        </nav>
        <SectionLink className="header-cta" href="#contact">Start a project</SectionLink>
        <MobileMenu />
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Design, development & digital systems</p>
          <h1>We bring ambitious ideas to life online.</h1>
          <p className="hero-intro">Northline Studio works with people building something of their own—from personal brands and independent practices to new ventures and growing companies—to create distinctive websites, commerce experiences, and digital systems.</p>
          <div className="hero-actions">
            <SectionLink className="button button-primary" href="#contact">Start a project</SectionLink>
          </div>
        </div>

        <div className="hero-visual" aria-label="Preview of a custom digital experience">
          <div className="visual-sun" />
          <div className="browser-card">
            <div className="browser-bar">
              <span className="browser-dots"><i /><i /><i /></span>
              <span className="browser-address">yourbrand.com</span>
            </div>
            <div className="browser-site">
              <div className="mini-nav"><b>NORTHLINE / STUDIO</b><span>WORK&nbsp;&nbsp; METHOD&nbsp;&nbsp; CONTACT</span></div>
              <p>VISUAL DIRECTION · SECURE BUILD</p>
              <h2>Your idea<br />should feel<br /><em>impossible to ignore.</em></h2>
              <button type="button" tabIndex={-1}>BEGIN THE BUILD</button>
              <div className="mini-art"><span className="mini-arch" /><span className="mini-circle" /></div>
            </div>
          </div>
          <div className="launch-badge"><span>✓</span><div><small>SYSTEM STATUS</small><strong>Launch-ready</strong></div></div>
          <p className="visual-note">Designed with taste.<br />Built for trust.</p>
        </div>

        <div className="hero-proof" aria-label="Service highlights">
          <span>Design-led</span><i>✦</i><span>Commerce-ready</span><i>✦</i><span>Systems-minded</span><i>✦</i><span>Managed care</span>
        </div>
      </section>

      <section className="services-section section-pad" id="services">
        <div className="services-heading">
          <p className="section-kicker">Our services</p>
          <h2>One studio.<br /><em>Four ways forward.</em></h2>
          <p className="services-intro">Whether you are shaping a personal presence, launching a new venture, or improving something already in motion, we bring design and technical execution together.</p>
        </div>
        <div className="service-list">
          {services.map((service) => (
            <article className="service" key={service.title}>
              <span className="service-number">{service.number}</span>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
              <ul>
                {service.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            </article>
          ))}
        </div>
        <p className="services-note">Every engagement is individually scoped, with deliverables, timing, and investment defined before work begins.</p>
      </section>

      <section className="pricing-section section-pad" id="pricing">
        <div className="pricing-heading">
          <div>
            <p className="section-kicker">Investment</p>
            <h2>Clear starting points.<br /><em>Thoughtfully tailored.</em></h2>
          </div>
          <p>Choose the closest starting point. We will shape the final scope around your identity, content, and technical requirements.</p>
        </div>

        <div className="pricing-grid">
          {pricingTiers.map((tier) => (
            <article className={`pricing-card${tier.featured ? " pricing-card-featured" : ""}`} key={tier.name}>
              <div className="pricing-card-topline"><span>{tier.number}</span>{tier.featured ? <small>Most popular</small> : null}</div>
              <h3>{tier.name}</h3>
              <p className="pricing-price">{tier.price}</p>
              <p className="pricing-description">{tier.description}</p>
              <h4>{tier.featureLabel ?? "Includes"}</h4>
              <ul>
                {tier.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
            </article>
          ))}
        </div>

        <div className="pricing-support">
          <article className="care-panel">
            <p className="pricing-label">Ongoing Care</p>
            <h3>Starting from $150/month</h3>
            <p>Hosting, monitoring, updates, security-minded maintenance, and agreed content support. Tailored ongoing partnerships are available for select clients who need regular design and development capacity.</p>
          </article>
        </div>

        <p className="pricing-terms">Third-party platforms, applications, themes, fonts, subscriptions, and transaction fees are quoted separately when applicable.</p>
      </section>

      <section className="process-section section-pad" id="process">
        <div className="process-intro">
          <p className="section-kicker light">Our process</p>
          <h2>From direction<br />to <em>dependable delivery.</em></h2>
        </div>
        <ol className="process-list">
          <li><span>01</span><div><h3>Direction</h3><p>We define the goals, audience, content, requirements, and measures of success.</p></div></li>
          <li><span>02</span><div><h3>Design</h3><p>We shape the structure, visual language, and experience into one clear direction.</p></div></li>
          <li><span>03</span><div><h3>Build</h3><p>We implement, integrate, test, and refine the approved solution.</p></div></li>
          <li><span>04</span><div><h3>Launch & Care</h3><p>We deploy the finished work and establish ongoing support when needed.</p></div></li>
        </ol>
      </section>

      <section className="about-section section-pad" id="about">
        <div className="about-card" aria-hidden="true">
          <NorthlineLogo className="about-logo" />
          <div className="about-lines"><i /><i /><i /></div>
          <span className="about-caption">DESIGN-LED<br />DIGITAL STUDIO</span>
        </div>
        <div className="about-copy">
          <p className="section-kicker">The studio approach</p>
          <h2>Boutique attention.<br /><em>Production-grade craft.</em></h2>
          <p>Northline Studio is a design-led digital studio for people and teams building something meaningful online. You work directly with the person shaping and building the solution, keeping the process clear and the result cohesive from first direction through launch.</p>
          <SectionLink className="text-link" href="#contact">Tell us what you are building</SectionLink>
        </div>
      </section>

      <section className="faq-section section-pad">
        <div className="faq-heading"><p className="section-kicker">Good to know</p><h2>Before we<br /><em>begin.</em></h2></div>
        <div className="faq-list">
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}<span>+</span></summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="contact-star" aria-hidden="true">✦</div>
        <p className="section-kicker light">Have something in mind?</p>
        <h2>Build it well.<br /><em>Run it with confidence.</em></h2>
        <p>For new projects, improvements, or ongoing support, email us directly:</p>
        <div className="contact-details">
          <span className="contact-label">Project inquiries</span>
          <span className="contact-email">northlinestudio425@gmail.com</span>
        </div>
        <div className="contact-brief">
          <h3>A thoughtful introduction.</h3>
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

      <footer>
        <SectionLink className="brand footer-brand" href="#top" aria-label="Back to top"><NorthlineLogo className="brand-logo" /><span className="brand-name">Northline<br />Studio</span></SectionLink>
        <p>Websites, commerce, and digital systems<br />for people building something of their own.</p>
        <div className="footer-links"><SectionLink href="#services">Services</SectionLink><SectionLink href="#pricing">Pricing</SectionLink><SectionLink href="#process">Process</SectionLink><SectionLink href="#about">About</SectionLink><SectionLink href="#contact">Contact</SectionLink></div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Northline Studio</span><span>Designed with care. Built to last.</span><SectionLink href="#top">Back to top ↑</SectionLink></div>
      </footer>
    </main>
  );
}
