const projects = [
  {
    number: "01",
    type: "Editorial Identity",
    name: "Aster Atelier",
    description: "A refined digital presence for a visual brand with a sharp point of view.",
    className: "project-aster",
    mockup: (
      <div className="project-screen aster-screen" aria-hidden="true">
        <div className="screen-nav">
          <span>ASTER ATELIER</span>
          <span>Work&nbsp;&nbsp; Journal&nbsp;&nbsp; Contact</span>
        </div>
        <div className="aster-copy">
          <span>VISUAL IDENTITY · DIGITAL SYSTEM</span>
          <strong>Presence with<br />quiet authority.</strong>
          <i>Enter the studio</i>
        </div>
        <div className="aster-orbit" />
      </div>
    ),
  },
  {
    number: "02",
    type: "Premium Portfolio",
    name: "Lucent House",
    description: "A cinematic portfolio system built for high-impact launches and inquiries.",
    className: "project-common",
    mockup: (
      <div className="project-screen common-screen" aria-hidden="true">
        <div className="common-stamp">LH<br /><small>INDEX</small></div>
        <span className="common-note">SELECTED WORK · PRESS · BOOKING</span>
        <strong>THE IMAGE<br />LEADS.</strong>
        <div className="portfolio-orb"><span /></div>
        <i>VIEW THE INDEX</i>
      </div>
    ),
  },
  {
    number: "03",
    type: "Secure Platform",
    name: "Meridian One",
    description: "A polished web platform engineered for speed, stability, and trust.",
    className: "project-northline",
    mockup: (
      <div className="project-screen northline-screen" aria-hidden="true">
        <div className="northline-nav"><b>MERIDIAN / ONE</b><span>SYSTEM&nbsp;&nbsp; SECURITY&nbsp;&nbsp; ACCESS</span></div>
        <div className="northline-shape" />
        <strong>DESIGNED SHARP.<br />BUILT SECURE.</strong>
        <i>OPEN THE SYSTEM</i>
      </div>
    ),
  },
];

const services = [
  {
    number: "01",
    title: "Creative Direction",
    text: "A distinct visual system, refined content structure, and interaction direction shaped around the way your brand should be perceived.",
    tags: ["Identity direction", "UX architecture", "Artful interface"],
  },
  {
    number: "02",
    title: "Technical Build",
    text: "Clean, modern development with fast load times, responsive behavior, strong accessibility, and the technical foundation to scale with confidence.",
    tags: ["Frontend engineering", "Performance", "SEO structure"],
  },
  {
    number: "03",
    title: "Secure Hosting & Care",
    text: "Managed deployment, monitoring, updates, and practical safeguards so the site stays stable, protected, and ready when your audience arrives.",
    tags: ["Managed hosting", "Security care", "Ongoing support"],
  },
];

const faqs = [
  {
    question: "What kind of projects do you take on?",
    answer: "Northline Studio is best suited for brands that care about perception, polish, and long-term reliability—whether the project is a focused portfolio, a launch site, or a more complete digital presence.",
  },
  {
    question: "How long does a project take?",
    answer: "Most focused sites take a few weeks from direction to launch. More layered builds with custom structure, content, or technical requirements are planned around a clear production schedule.",
  },
  {
    question: "Can you elevate an existing site?",
    answer: "Yes. We can preserve what is useful, sharpen the visual system, improve performance, and rebuild the experience so it feels more current, premium, and credible.",
  },
  {
    question: "What happens after launch?",
    answer: "The site can stay under managed care with hosting, updates, security-minded maintenance, backups, and thoughtful support when new content or changes are needed.",
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
        <a className="brand" href="#top" aria-label="Northline Studio, home">
          <NorthlineLogo className="brand-logo" />
          <span className="brand-name">Northline<br />Studio</span>
        </a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#work">Work</a>
          <a href="#services">Services</a>
          <a href="#process">Process</a>
          <a href="#about">About</a>
        </nav>
        <a className="header-cta" href="#contact">Start a project</a>
        <details className="mobile-menu">
          <summary aria-label="Open navigation">Menu</summary>
          <nav aria-label="Mobile navigation">
            <a href="#work">Work</a>
            <a href="#services">Services</a>
            <a href="#process">Process</a>
            <a href="#about">About</a>
            <a href="#contact">Start a project</a>
          </nav>
        </details>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Design-led websites & digital systems</p>
          <h1>A digital studio for brands that need to look <em>exceptional.</em></h1>
          <p className="hero-intro">Northline Studio creates elevated web experiences with strong visual direction, precise engineering, secure hosting, and the kind of polish that makes a brand feel established from the first click.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#contact">Build your presence</a>
            <a className="text-link" href="#work">See studio concepts <span>↓</span></a>
          </div>
        </div>

        <div className="hero-visual" aria-label="Preview of a custom business website">
          <div className="visual-sun" />
          <div className="browser-card">
            <div className="browser-bar">
              <span className="browser-dots"><i /><i /><i /></span>
              <span className="browser-address">yourbrand.com</span>
            </div>
            <div className="browser-site">
              <div className="mini-nav"><b>NORTHLINE / STUDIO</b><span>WORK&nbsp;&nbsp; METHOD&nbsp;&nbsp; CONTACT</span></div>
              <p>VISUAL DIRECTION · SECURE BUILD</p>
              <h2>Your brand<br />should feel<br /><em>impossible to ignore.</em></h2>
              <button type="button" tabIndex={-1}>BEGIN THE BUILD</button>
              <div className="mini-art"><span className="mini-arch" /><span className="mini-circle" /></div>
            </div>
          </div>
          <div className="launch-badge"><span>✓</span><div><small>SYSTEM STATUS</small><strong>Launch-ready</strong></div></div>
          <p className="visual-note">Designed with taste.<br />Built for trust.</p>
        </div>

        <div className="hero-proof" aria-label="Service highlights">
          <span>Design-led</span><i>✦</i><span>High-performance</span><i>✦</i><span>Secure hosting</span><i>✦</i><span>Managed care</span>
        </div>
      </section>

      <section className="intro-section section-pad">
        <p className="section-kicker">What a premium site should do</p>
        <div className="intro-grid">
          <h2>Create desire, build trust, and make the brand feel <em>inevitable.</em></h2>
          <div className="intro-copy">
            <p>Your website is often the first serious proof of your taste, credibility, and ambition. It should feel considered at every detail: layout, motion, typography, performance, and the path toward inquiry.</p>
            <p>Northline Studio brings design sensibility and technical discipline together, creating digital homes that look refined, load quickly, stay dependable, and support the next stage of your brand.</p>
          </div>
        </div>
      </section>

      <section className="work-section section-pad" id="work">
        <div className="section-heading">
          <div><p className="section-kicker light">Selected concepts</p><h2>Designed for<br /><em>presence.</em></h2></div>
          <p>Each concept explores a different kind of digital authority: editorial, visual, technical, and commercial.</p>
        </div>
        <div className="project-list">
          {projects.map((project) => (
            <article className={`project ${project.className}`} key={project.name}>
              <div className="project-meta">
                <span>{project.number}</span>
                <p>{project.type}</p>
                <small>CONCEPT PROJECT</small>
              </div>
              <div className="project-visual">{project.mockup}</div>
              <div className="project-info">
                <h3>{project.name}</h3>
                <p>{project.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section section-pad" id="services">
        <div className="services-heading">
          <p className="section-kicker">Studio capabilities</p>
          <h2>Sharp creative.<br /><em>Serious engineering.</em></h2>
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
      </section>

      <section className="process-section section-pad" id="process">
        <div className="process-intro">
          <p className="section-kicker light">A focused process</p>
          <h2>From direction<br />to <em>deployment.</em></h2>
          <p>A clear creative path, disciplined technical execution, and a polished launch without unnecessary noise.</p>
        </div>
        <ol className="process-list">
          <li><span>01</span><div><h3>Direction</h3><p>We define the brand position, audience expectations, content priorities, and the feeling the site needs to create.</p></div></li>
          <li><span>02</span><div><h3>Design system</h3><p>The visual language, page rhythm, and interaction details are shaped into a refined experience that feels unmistakably intentional.</p></div></li>
          <li><span>03</span><div><h3>Engineering</h3><p>The approved direction becomes a fast, responsive, accessible site built with clean code and a stable technical foundation.</p></div></li>
          <li><span>04</span><div><h3>Launch & protect</h3><p>Deployment, hosting, updates, and ongoing care are handled so the finished site remains secure, reliable, and ready to perform.</p></div></li>
        </ol>
      </section>

      <section className="about-section section-pad" id="about">
        <div className="about-card" aria-hidden="true">
          <NorthlineLogo className="about-logo" />
          <div className="about-lines"><i /><i /><i /></div>
          <span className="about-caption">INDEPENDENT<br />DESIGN STUDIO</span>
        </div>
        <div className="about-copy">
          <p className="section-kicker">The studio approach</p>
          <h2>Boutique attention.<br /><em>Production-grade craft.</em></h2>
          <p>Northline Studio is built for brands that want more than a pleasant template. The work sits at the intersection of taste, clarity, engineering, and long-term reliability.</p>
          <p>You work directly with a dedicated maker from direction through launch, which keeps the process precise, personal, and focused on creating a digital presence that feels premium from the outside and dependable underneath.</p>
          <a className="text-link" href="#contact">Tell me about your vision</a>
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
        <p className="section-kicker light">Ready for a sharper presence?</p>
        <h2>Let&apos;s build the site your brand<br /><em>deserves.</em></h2>
        <p>Tell me what you are building, what needs to feel elevated, and where the website needs to perform. The first conversation is focused, thoughtful, and pressure-free.</p>
        <a className="button button-light" href="mailto:hello@yourstudio.com?subject=New%20Northline%20Studio%20project">Start the conversation</a>
        <small>Selective new projects now open</small>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top" aria-label="Back to top"><NorthlineLogo className="brand-logo" /><span className="brand-name">Northline<br />Studio</span></a>
        <p>Design-led web experiences, secure hosting,<br />and managed care for brands with high standards.</p>
        <div className="footer-links"><a href="#work">Work</a><a href="#services">Services</a><a href="#about">About</a><a href="#contact">Contact</a></div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Northline Studio</span><span>Designed with care. Built to last.</span><a href="#top">Back to top ↑</a></div>
      </footer>
    </main>
  );
}
