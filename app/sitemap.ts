import type { MetadataRoute } from "next";
import { site, sections } from "@/lib/site/config";
import { getAllContent, getAllReading, contentUrl } from "@/lib/content/load";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [...sections.map((s) => s.href), "/search"].map((href) => ({
    url: `${site.url}${href === "/" ? "" : href}`,
    changeFrequency: "weekly" as const,
  }));

  const contentRoutes = getAllContent()
    .filter((i) => !i.draft)
    .map((item) => ({
      url: `${site.url}${contentUrl(item)}`,
      lastModified: ("updated" in item && item.updated) || item.date,
      changeFrequency: "monthly" as const,
    }));

  const readingRoutes = getAllReading().map((book) => ({
    url: `${site.url}/reading/${book.slug}`,
    changeFrequency: "monthly" as const,
  }));

  return [...staticRoutes, ...contentRoutes, ...readingRoutes];
}
