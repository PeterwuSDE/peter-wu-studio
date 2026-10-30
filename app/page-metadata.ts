import type { Metadata } from "next";
import { siteOrigin } from "./site";

const shareImage = {
  url: "/og.png",
  width: 1658,
  height: 949,
  alt: "Northline Studio — design-led websites and digital systems",
} as const;

export function canonicalUrl(path: string) {
  return path === "/" ? `${siteOrigin}/` : `${siteOrigin}${path}`;
}

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const url = canonicalUrl(path);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "website",
      url,
      siteName: "Northline Studio",
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImage.url],
    },
  };
}
