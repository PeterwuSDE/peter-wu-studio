import type { MetadataRoute } from "next";
import { canonicalUrl } from "./page-metadata";
import { publicPaths } from "./site";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map((path) => ({ url: canonicalUrl(path) }));
}
