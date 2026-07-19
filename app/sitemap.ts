import type { MetadataRoute } from "next";
import { site, sections } from "@/lib/site/config";
import { getAllContent, contentUrl } from "@/lib/content/load";

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

  return [...staticRoutes, ...contentRoutes];
}
