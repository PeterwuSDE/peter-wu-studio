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
          <i>Explore our approach →</i>
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
        <i>VIEW THE MENU ↗</i>
      </div>
    ),
  },
  {
    number: "03",
    type: "Home Services",
    name: "Northline Build",
    description: "A bold, direct site that makes quality craftsmanship easy to trust.",
    className: "project-northline",
    mockup: (
      <div className="project-screen northline-screen" aria-hidden="true">
        <div className="northline-nav"><b>NORTHLINE / BUILD</b><span>PROJECTS&nbsp;&nbsp; PROCESS&nbsp;&nbsp; CONTACT</span></div>
        <div className="northline-shape" />
        <strong>BUILT RIGHT.<br />BUILT TO LAST.</strong>
        <i>START A PROJECT →</i>
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

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Peter Wu Studio, home">
          <span className="brand-mark">PW</span>
          <span>Peter Wu<br />Studio</span>
        </a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#work">Work</a>
          <a href="#services">Services</a>
          <a href="#process">Process</a>
          <a href="#about">About</a>
        </nav>
        <a className="header-cta" href="#contact">Start a project <span>↗</span></a>
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
            <a className="button button-primary" href="#contact">Let&apos;s work together <span>↗</span></a>
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
              <button type="button" tabIndex={-1}>WORK WITH US&nbsp;&nbsp; ↗</button>
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
                <span className="project-arrow" aria-hidden="true">↗</span>
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
          <span className="about-pw">PW</span>
          <div className="about-lines"><i /><i /><i /></div>
          <span className="about-caption">INDEPENDENT<br />DESIGN STUDIO</span>
        </div>
        <div className="about-copy">
          <p className="section-kicker">The person behind the pixels</p>
          <h2>Big-agency thinking.<br /><em>One-to-one attention.</em></h2>
          <p>Hi, I&apos;m Peter. I help small businesses show up online with the same care and quality they bring to their own work.</p>
          <p>You&apos;ll work directly with me from our first conversation through launch. That means fewer handoffs, clearer communication, and a website built by someone who knows your story.</p>
          <a className="text-link" href="#contact">Tell me about your business <span>↗</span></a>
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
        <a className="button button-light" href="mailto:hello@yourstudio.com?subject=New%20website%20project">Start the conversation <span>↗</span></a>
        <small>Currently accepting new projects</small>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top" aria-label="Back to top"><span className="brand-mark">PW</span><span>Peter Wu<br />Studio</span></a>
        <p>Web design, development & ongoing care<br />for small businesses that care about their work.</p>
        <div className="footer-links"><a href="#work">Work</a><a href="#services">Services</a><a href="#about">About</a><a href="#contact">Contact</a></div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Peter Wu Studio</span><span>Designed with care. Built to last.</span><a href="#top">Back to top ↑</a></div>
      </footer>
    </main>
  );
}
