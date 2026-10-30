import { siteEmail, siteOrigin, siteUrl } from "./site";

const studioId = `${siteUrl}#studio`;
const siteDescription =
  "Northline Studio is a web design studio for people building something of their own. We create distinctive websites, commerce experiences, and digital systems, then help them stay findable and cared for.";

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

function serviceOffer(name: string, description: string, category: string[], url: string) {
  return {
    "@type": "Offer",
    name,
    url,
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
  url: string,
  priceSpecification?: Record<string, string | number>,
) {
  return {
    "@type": "Offer",
    name,
    description,
    url,
    ...(priceSpecification ? { priceSpecification } : {}),
    itemOffered: {
      "@type": "Service",
      name,
      description,
      provider: { "@id": studioId },
    },
  };
}

const websitesUrl = `${siteOrigin}/websites`;
const seoUrl = `${siteOrigin}/seo`;
const careUrl = `${siteOrigin}/care`;

const essentialDescription =
  "Starting from $2,500. A focused digital home for an independent professional, emerging brand, or service-led venture. Includes: Up to 3 custom-designed pages; Responsive development; Foundational SEO and accessibility; Domain and launch configuration.";

const signatureDescription =
  "Starting from $3,500. A more complete digital presence with greater room for content, storytelling, and refined interaction. Includes: Up to 7 custom-designed pages; Deeper content architecture; Galleries, motion, and selected integrations; Expanded SEO and launch support.";

const commerceDescription =
  "Custom proposal. A new or redesigned Shopify storefront shaped around your products and customer journey. Possible scope: Store setup or redesign; Product and collection experience; Payments and subscriptions; Testing and launch support.";

const systemsDescription =
  "Custom proposal. A tailored digital system built around a clear operational need. Possible scope: Booking and client intake; Payments and deposits; CRM and automation; Connected business tools.";

const careDescription =
  "Starting from $199/month. Includes: Hosting; Uptime monitoring; Security and dependency updates; Backups; Up to 1 hour of small content changes per month. Additional work is billed at $125/hour. Unused hours do not roll over. A 3-month minimum term applies.";

const carePlusDescription =
  "Starting from $399/month. Includes: Everything in Care; Up to 3 hours of changes per month; Priority response; Monthly site report. Additional work is billed at $125/hour. Unused hours do not roll over. A 3-month minimum term applies.";

const hourlyDescription = "Additional work is billed at $125/hour.";

const partnershipDescription =
  "Tailored ongoing partnerships are available for select clients who need regular design and development capacity.";

const websitesDescription =
  "Content-only and static sites for personal brands and businesses, Shopify storefronts, and redesigns and migrations, including moves off Wix or Squarespace and rebuilds of slow or outdated sites.";

const seoDescription =
  "An SEO health check, a 90-day launch measured by a set checklist, and ongoing monthly search work. The checklist covers Core Web Vitals, indexing, structured data, titles and meta descriptions, internal links, Google Business Profile, and local citations. The work includes visibility in Google Maps and in AI assistants such as ChatGPT and Gemini.";

const careServiceDescription =
  "Reliable hosting, maintenance, monitoring, and improvements that keep a digital presence secure and current. Care starts from $199/month and Care Plus starts from $399/month. Additional work is billed at $125/hour. Unused hours do not roll over. A 3-month minimum term applies.";

function serviceNode(
  path: string,
  name: string,
  serviceType: string,
  description: string,
  offers?: Record<string, unknown>[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${siteOrigin}${path}#service`,
    name,
    serviceType,
    description,
    url: `${siteOrigin}${path}`,
    provider: { "@id": studioId },
    ...(offers ? { offers } : {}),
  };
}

export const websitesServiceJsonLd = serviceNode(
  "/websites",
  "Website design and builds",
  "Web design",
  websitesDescription,
  [
    packageOffer("The Essential Website", essentialDescription, websitesUrl, startingPrice(2500)),
    packageOffer("The Signature Website", signatureDescription, websitesUrl, startingPrice(3500)),
    packageOffer("Commerce", commerceDescription, websitesUrl),
    packageOffer("Business Systems", systemsDescription, websitesUrl),
  ],
);

export const seoServiceJsonLd = serviceNode("/seo", "Search optimization", "SEO", seoDescription);

export const careServiceJsonLd = serviceNode("/care", "Ongoing care", "Website maintenance", careServiceDescription, [
  packageOffer("Care", careDescription, careUrl, monthlyPrice(199)),
  packageOffer("Care Plus", carePlusDescription, careUrl, monthlyPrice(399)),
  packageOffer("Additional work", hourlyDescription, careUrl, {
    "@type": "UnitPriceSpecification",
    price: 125,
    priceCurrency: usd,
    unitCode: "HUR",
    unitText: "hour",
  }),
  packageOffer("Tailored ongoing partnerships", partnershipDescription, careUrl),
]);

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
        "Website design and builds",
        websitesDescription,
        ["Content sites", "Shopify storefronts", "Redesigns and migrations"],
        websitesUrl,
      ),
      serviceOffer(
        "Search optimization",
        seoDescription,
        ["SEO audit", "90-day launch", "Ongoing monthly SEO"],
        seoUrl,
      ),
      serviceOffer(
        "Ongoing care",
        "Reliable hosting, maintenance, monitoring, and improvements that keep your digital presence secure and current.",
        ["Hosting and deployment", "Monitoring and maintenance", "Content and optimization"],
        careUrl,
      ),
      packageOffer("The Essential Website", essentialDescription, websitesUrl, startingPrice(2500)),
      packageOffer("The Signature Website", signatureDescription, websitesUrl, startingPrice(3500)),
      packageOffer("Commerce", commerceDescription, websitesUrl),
      packageOffer("Business Systems", systemsDescription, websitesUrl),
      packageOffer("Care", careDescription, careUrl, monthlyPrice(199)),
      packageOffer("Care Plus", carePlusDescription, careUrl, monthlyPrice(399)),
      packageOffer("Additional work", hourlyDescription, careUrl, {
        "@type": "UnitPriceSpecification",
        price: 125,
        priceCurrency: usd,
        unitCode: "HUR",
        unitText: "hour",
      }),
      packageOffer("Tailored ongoing partnerships", partnershipDescription, careUrl),
    ],
  },
};
