const projects = [
  {
    number: "01",
    type: "Professional Services",
    name: "Aster & Co.",
    description: "A calm, confident digital home for an advisory firm built on trust.",
    className: "project-aster",
    mockup: (
      <div className="project-screen aster-screen" aria-hidden="true">
        <div className="screen-nav">
          <span>ASTER & CO.</span>
          <span>Services&nbsp;&nbsp; About&nbsp;&nbsp; Contact</span>
        </div>
        <div className="aster-copy">
          <span>THOUGHTFUL ADVICE. LASTING VALUE.</span>
          <strong>Clarity for every<br />turn ahead.</strong>
          <i>Explore our approach</i>
        </div>
        <div className="aster-orbit" />
      </div>
    ),
  },
  {
    number: "02",
    type: "Local Business",
    name: "Common Ground",
    description: "A warm, neighborhood-first website designed to turn visits into regulars.",
    className: "project-common",
    mockup: (
      <div className="project-screen common-screen" aria-hidden="true">
        <div className="common-stamp">CG<br /><small>EST. 2019</small></div>
        <span className="common-note">COFFEE · COMMUNITY · EVERY DAY</span>
        <strong>GOOD DAYS<br />START HERE.</strong>
        <div className="coffee-cup"><span /></div>
        <i>VIEW THE MENU</i>
      </div>
    ),
  },
  {
    number: "03",
    type: "Home Services",
    name: "Summit Build",
    description: "A bold, direct site that makes quality craftsmanship easy to trust.",
    className: "project-northline",
    mockup: (
      <div className="project-screen northline-screen" aria-hidden="true">
        <div className="northline-nav"><b>SUMMIT / BUILD</b><span>PROJECTS&nbsp;&nbsp; PROCESS&nbsp;&nbsp; CONTACT</span></div>
        <div className="northline-shape" />
        <strong>BUILT RIGHT.<br />BUILT TO LAST.</strong>
        <i>START A PROJECT</i>
      </div>
    ),
  },
];

const services = [
  {
    number: "01",
    title: "Strategy & Design",
    text: "A clear plan, purposeful structure, and a custom visual direction shaped around your business—not a recycled template.",
    tags: ["Discovery", "UX direction", "Visual design"],
  },
  {
    number: "02",
    title: "Development",
    text: "Fast, responsive pages built with care so your site feels effortless on every screen and is easy to find online.",
    tags: ["Responsive build", "SEO foundations", "Performance"],
  },
  {
    number: "03",
    title: "Hosting & Care",
    text: "Reliable hosting, updates, backups, and a real person to call when you need help after your new site goes live.",
    tags: ["Managed hosting", "Maintenance", "Ongoing support"],
  },
];

const faqs = [
  {
    question: "How much does a website cost?",
    answer: "Every project is a little different. After a short conversation, you’ll receive a clear proposal based on the pages, features, and support your business actually needs.",
  },
  {
    question: "How long does it take?",
    answer: "Most small-business websites take a few weeks from kickoff to launch. The exact timeline depends on scope and how quickly content and feedback come together.",
  },
  {
    question: "Can you redesign my current website?",
    answer: "Absolutely. We can keep what is working, rethink what is not, and create a more modern, focused experience around your current business goals.",
  },
  {
    question: "What happens after launch?",
    answer: "You won’t be left on your own. Ongoing hosting, maintenance, backups, and content updates can all be handled for you.",
  },
];

function NorthlineLogo({ className = "" }: { className?: string }) {
  return (
    <svg className={`northline-logo ${className}`} viewBox="0 0 100 100" role="img" aria-label="北境 logo">
      <circle className="northline-logo-ring" cx="50" cy="50" r="46" />
      <g className="northline-logo-glyph northline-logo-north" transform="translate(35 36) scale(.025 -.025) translate(-494 -356.5)">
        <path d="M595 -20Q546 -4 540 46Q535 99 535 141L536 184V221L538 621Q540 671 529 716Q521 747 509 767L505 776L517 786L545 761L612 703Q619 697 619 693Q619 689 616 683Q605 659 603 630L595 444L593 382V371L616 386Q687 436 734 492Q746 506 755 519Q769 541 769 565Q769 575 768 580L783 587L845 507Q848 503 850.5 498Q853 493 852 487L840 481L818 468Q733 407 677 378L606 341L592 335V328L590 100Q590 88 591 76.5Q592 65 593 53Q596 33 617 28Q650 19 696 19Q757 19 797 30L821 39Q846 50 856 83Q868 121 873 167L882 243L883 248H898L899 245L903 155L912 60L919 21Q920 18 920 12Q920 0 904 -7L868 -20Q808 -35 755 -35H680Q637 -34 595 -20ZM330 -4Q338 28 340 58.5Q342 89 343 144V147L334 142L152 30L143 25Q136 22 132 26Q101 44 68 71L70 81L96 89Q126 96 140 103Q187 119 233.5 139Q280 159 340 189L345 192L348 411Q277 403 229 395.5Q181 388 134 373L69 419L72 429H81Q136 429 164 431Q241 437 286 450Q305 454 321 466Q328 464 334.5 457.5Q341 451 347 445V459L345 617Q343 684 327 728Q322 743 308 771L316 781L320 778L410 702L418 695Q423 688 420 681Q412 659 410 622L405 509L402 394L397 144L396 -54V-64L384 -73L333 -20Q327 -14 330 -4Z" />
      </g>
      <g className="northline-logo-glyph northline-logo-south" transform="translate(65 65) scale(.025 -.025) translate(-480.5 -344.5)">
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
          <p className="eyebrow"><span /> Independent web design & development</p>
          <h1>Websites that make your business look <em>as good as it is.</em></h1>
          <p className="hero-intro">Custom design, reliable hosting, and ongoing support—all handled for you, so you can focus on running your business.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#contact">Let&apos;s work together</a>
            <a className="text-link" href="#work">See selected work <span>↓</span></a>
          </div>
        </div>

        <div className="hero-visual" aria-label="Preview of a custom business website">
          <div className="visual-sun" />
          <div className="browser-card">
            <div className="browser-bar">
              <span className="browser-dots"><i /><i /><i /></span>
              <span className="browser-address">yourbusiness.com</span>
            </div>
            <div className="browser-site">
              <div className="mini-nav"><b>THE GOOD CO.</b><span>ABOUT&nbsp;&nbsp; SERVICES&nbsp;&nbsp; CONTACT</span></div>
              <p>LOCAL EXPERTISE · PERSONAL SERVICE</p>
              <h2>Great work<br />deserves a<br /><em>great website.</em></h2>
              <button type="button" tabIndex={-1}>WORK WITH US</button>
              <div className="mini-art"><span className="mini-arch" /><span className="mini-circle" /></div>
            </div>
          </div>
          <div className="launch-badge"><span>✓</span><div><small>YOUR SITE</small><strong>Ready to launch</strong></div></div>
          <p className="visual-note">Designed to be clear.<br />Built to work hard.</p>
        </div>

        <div className="hero-proof" aria-label="Service highlights">
          <span>Custom-built</span><i>✦</i><span>Mobile-first</span><i>✦</i><span>Fully managed</span><i>✦</i><span>Human support</span>
        </div>
      </section>

      <section className="intro-section section-pad">
        <p className="section-kicker">What your website should do</p>
        <div className="intro-grid">
          <h2>Make a strong first impression—and make the next step <em>obvious.</em></h2>
          <div className="intro-copy">
            <p>Your website should build trust, explain your value, and help the right people choose you. It shouldn&apos;t become one more technical problem on your list.</p>
            <p>I take care of the whole process—from the first idea to launch and ongoing care—so you get a site that looks sharp and earns its place in your business.</p>
          </div>
        </div>
      </section>

      <section className="work-section section-pad" id="work">
        <div className="section-heading">
          <div><p className="section-kicker light">Selected concepts</p><h2>Work with<br /><em>purpose.</em></h2></div>
          <p>Each site starts with a different business problem—and ends with a clear, considered digital experience.</p>
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
          <p className="section-kicker">How I can help</p>
          <h2>Everything you need.<br /><em>None of the runaround.</em></h2>
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
          <p className="section-kicker light">A simple process</p>
          <h2>From first hello<br />to <em>launch day.</em></h2>
          <p>Clear steps, honest communication, and no disappearing into a black box.</p>
        </div>
        <ol className="process-list">
          <li><span>01</span><div><h3>Discover</h3><p>We talk about your business, your customers, and what the website needs to accomplish.</p></div></li>
          <li><span>02</span><div><h3>Design</h3><p>I shape the strategy, content flow, and visual direction into a site that feels distinctly yours.</p></div></li>
          <li><span>03</span><div><h3>Build</h3><p>The approved design becomes a fast, responsive website, tested across devices.</p></div></li>
          <li><span>04</span><div><h3>Launch & care</h3><p>We go live with confidence, then I stay available for hosting, updates, and support.</p></div></li>
        </ol>
      </section>

      <section className="about-section section-pad" id="about">
        <div className="about-card" aria-hidden="true">
          <NorthlineLogo className="about-logo" />
          <div className="about-lines"><i /><i /><i /></div>
          <span className="about-caption">INDEPENDENT<br />DESIGN STUDIO</span>
        </div>
        <div className="about-copy">
          <p className="section-kicker">The person behind the pixels</p>
          <h2>Big-agency thinking.<br /><em>One-to-one attention.</em></h2>
          <p>Northline Studio helps small businesses show up online with the same care and quality they bring to their own work.</p>
          <p>You&apos;ll work directly with one dedicated maker from our first conversation through launch. That means fewer handoffs, clearer communication, and a website built by someone who knows your story.</p>
          <a className="text-link" href="#contact">Tell me about your business</a>
        </div>
      </section>

      <section className="faq-section section-pad">
        <div className="faq-heading"><p className="section-kicker">Good to know</p><h2>A few common<br /><em>questions.</em></h2></div>
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
        <p className="section-kicker light">Have a project in mind?</p>
        <h2>Let&apos;s make your website<br /><em>work harder.</em></h2>
        <p>Tell me a little about your business and where you want to go next. The first conversation is free, friendly, and pressure-free.</p>
        <a className="button button-light" href="mailto:hello@yourstudio.com?subject=New%20website%20project">Start the conversation</a>
        <small>Currently accepting new projects</small>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top" aria-label="Back to top"><NorthlineLogo className="brand-logo" /><span className="brand-name">Northline<br />Studio</span></a>
        <p>Web design, development & ongoing care<br />for small businesses that care about their work.</p>
        <div className="footer-links"><a href="#work">Work</a><a href="#services">Services</a><a href="#about">About</a><a href="#contact">Contact</a></div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Northline Studio</span><span>Designed with care. Built to last.</span><a href="#top">Back to top ↑</a></div>
      </footer>
    </main>
  );
}
