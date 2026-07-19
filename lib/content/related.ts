import { getAllContent, findById, contentId, type ContentItem } from "@/lib/content/load";

function tagsOf(item: ContentItem): string[] {
  return item.tags ?? [];
}

/**
 * Related content for an item. Explicit `related` frontmatter always ranks
 * above inferred shared-tag matches; ties break by recency.
 */
export function relatedContent(item: ContentItem, limit = 4): ContentItem[] {
  const selfId = contentId(item);
  const explicitIds =
    "related" in item && Array.isArray(item.related) ? item.related : [];

  const explicit = explicitIds
    .map((id) => findById(id))
    .filter((x): x is ContentItem => Boolean(x) && contentId(x!) !== selfId);

  const explicitSet = new Set(explicit.map((e) => contentId(e)));
  const myTags = new Set(tagsOf(item));

  const inferred = getAllContent()
    .filter((other) => {
      const id = contentId(other);
      return id !== selfId && !explicitSet.has(id);
    })
    .map((other) => {
      const shared = tagsOf(other).filter((t) => myTags.has(t)).length;
      const sameDomain =
        "domains" in item && "domains" in other
          ? other.domains.some((d) => (item.domains as string[]).includes(d))
          : false;
      return { other, score: shared * 2 + (sameDomain ? 1 : 0) };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.other.date.localeCompare(a.other.date))
    .map(({ other }) => other);

  return [...explicit, ...inferred].slice(0, limit);
}
