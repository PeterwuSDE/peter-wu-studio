import { siteEmail, siteUrl } from "./site";

const studioId = `${siteUrl}#studio`;
const siteDescription =
  "Northline Studio designs and builds distinctive websites, commerce experiences, and digital systems for people and teams building something of their own.";

const usd = "USD";

function startingPrice(minPrice: number) {
  return {
    "@type": "PriceSpecification",
    minPrice,
    priceCurrency: usd,
  };
}

function monthlyPrice(minPrice: number) {
  return {
    "@type": "UnitPriceSpecification",
    minPrice,
    priceCurrency: usd,
    unitCode: "MON",
    unitText: "month",
  };
}

function serviceOffer(name: string, description: string, category: string[]) {
  return {
    "@type": "Offer",
    url: siteUrl,
    itemOffered: {
      "@type": "Service",
      name,
      description,
      category,
      provider: { "@id": studioId },
    },
  };
}

function packageOffer(
  name: string,
  description: string,
  priceSpecification?: Record<string, string | number>,
) {
  return {
    "@type": "Offer",
    name,
    description,
    url: siteUrl,
    ...(priceSpecification ? { priceSpecification } : {}),
    itemOffered: {
      "@type": "Service",
      name,
      description,
      provider: { "@id": studioId },
    },
  };
}

export const studioJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": studioId,
  name: "Northline Studio",
  url: siteUrl,
  description: siteDescription,
  slogan: "We bring ambitious ideas to life online.",
  email: siteEmail,
  logo: {
    "@type": "ImageObject",
    url: `${siteUrl}favicon.png`,
    width: 512,
    height: 512,
  },
  image: {
    "@type": "ImageObject",
    url: `${siteUrl}og.png`,
    width: 1658,
    height: 949,
    caption: "Northline Studio — design-led websites and digital systems",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Project inquiries",
    email: siteEmail,
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Services",
    itemListElement: [
      serviceOffer(
        "Websites & Brand Presence",
        "Distinctive, carefully built websites that give your work, idea, or organization a credible and memorable home online.",
        ["Custom websites", "Portfolios & editorial", "Redesigns & migrations"],
      ),
      serviceOffer(
        "Commerce",
        "Considered Shopify experiences designed to present products clearly and make buying feel effortless.",
        ["Shopify stores", "Storefront redesign", "Payments & subscriptions"],
      ),
      serviceOffer(
        "Business Systems",
        "Practical digital systems that simplify bookings, client intake, payments, communication, and everyday operations.",
        ["Booking & scheduling", "CRM & automation", "Multi-tool suites"],
      ),
      serviceOffer(
        "Ongoing Care",
        "Reliable hosting, maintenance, monitoring, and improvements that keep your digital presence secure and current.",
        ["Hosting & deployment", "Monitoring & maintenance", "Content & optimization"],
      ),
      packageOffer(
        "The Essential Website",
        "Starting from $2,500. A focused digital home for an independent professional, emerging brand, or service-led venture. Includes: Up to 3 custom-designed pages; Responsive development; Foundational SEO and accessibility; Domain and launch configuration.",
        startingPrice(2500),
      ),
      packageOffer(
        "The Signature Website",
        "Starting from $3,500. A more complete digital presence with greater room for content, storytelling, and refined interaction. Includes: Up to 7 custom-designed pages; Deeper content architecture; Galleries, motion, and selected integrations; Expanded SEO and launch support.",
        startingPrice(3500),
      ),
      packageOffer(
        "Commerce",
        "Custom proposal. A new or redesigned Shopify storefront shaped around your products and customer journey. Possible scope: Store setup or redesign; Product and collection experience; Payments and subscriptions; Testing and launch support.",
      ),
      packageOffer(
        "Business Systems",
        "Custom proposal. A tailored digital system built around a clear operational need. Possible scope: Booking and client intake; Payments and deposits; CRM and automation; Connected business tools.",
      ),
      packageOffer(
        "Care",
        "Starting from $199/month. Includes: Hosting; Uptime monitoring; Security and dependency updates; Backups; Up to 1 hour of small content changes per month. Unused hours do not roll over. A 3-month minimum term applies.",
        monthlyPrice(199),
      ),
      packageOffer(
        "Care Plus",
        "Starting from $399/month. Includes: Everything in Care; Up to 3 hours of changes per month; Priority response; Monthly site report. Unused hours do not roll over. A 3-month minimum term applies.",
        monthlyPrice(399),
      ),
      packageOffer(
        "Additional work",
        "Additional work is billed at $125/hour.",
        {
          "@type": "UnitPriceSpecification",
          price: 125,
          priceCurrency: usd,
          unitCode: "HUR",
          unitText: "hour",
        },
      ),
      packageOffer(
        "Tailored ongoing partnerships",
        "Tailored ongoing partnerships are available for select clients who need regular design and development capacity.",
      ),
    ],
  },
};
