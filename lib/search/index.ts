import { sections } from "@/lib/site/config";
import { getAllContent, contentId, contentTitle, contentUrl } from "@/lib/content/load";
import { stripMarkdown } from "@/lib/content/derive";
import type { SearchDoc } from "@/lib/search/query";

export type { SearchDoc, SearchResult } from "@/lib/search/query";
export { querySearchIndex } from "@/lib/search/query";

/** Built server-side; served as static JSON from /search-index.json. */
export function buildSearchIndex(): SearchDoc[] {
  const docs: SearchDoc[] = [];

  for (const item of getAllContent()) {
    const title = contentTitle(item);
    const bodyText =
      item.kind === "musing"
        ? item.body
        : item.kind === "video"
          ? (item.transcript ?? "")
          : item.body;
    const description = "description" in item ? item.description : "";
    docs.push({
      id: contentId(item),
      url: contentUrl(item),
      type: item.kind === "project" ? "project" : item.kind,
      title,
      date: item.date,
      tags: item.tags ?? [],
      text: [title, description, (item.tags ?? []).join(" "), stripMarkdown(bodyText)]
        .join(" ")
        .toLowerCase()
        .slice(0, 4000),
    });
  }

  // topic docs from tags used at least twice
  const tagCounts = new Map<string, number>();
  for (const item of getAllContent())
    for (const t of item.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  for (const [tag, count] of tagCounts)
    if (count >= 2)
      docs.push({
        id: `topic/${tag}`,
        url: `/search?q=${encodeURIComponent(tag)}`,
        type: "topic",
        title: tag,
        tags: [],
        text: tag.toLowerCase(),
      });

  // navigation destinations
  for (const s of sections)
    docs.push({
      id: `page/${s.id}`,
      url: s.href,
      type: "page",
      title: s.label,
      tags: [],
      text: `${s.label} ${s.coordinate}`.toLowerCase(),
    });

  return docs;
}
