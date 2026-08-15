import { describe, expect, it } from "vitest";
import { buildSearchIndex } from "@/lib/search/index";
import { querySearchIndex } from "@/lib/search/query";
import { contentId, getAllContent } from "@/lib/content/load";

describe("search index", () => {
  const docs = buildSearchIndex();

  it("indexes every published item, plus the static pages", () => {
    const ids = new Set(docs.map((d) => d.id));
    for (const item of getAllContent()) {
      expect(ids.has(contentId(item)), `missing ${contentId(item)}`).toBe(true);
    }
    // Pages are not content files, so they are always in the index.
    expect(docs.some((d) => d.type === "page")).toBe(true);
  });

  it("has no duplicate ids", () => {
    const ids = docs.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("querySearchIndex", () => {
  const docs = buildSearchIndex();

  it("finds an item by a prefix of its title", () => {
    const target = docs.find((d) => d.type === "note")!;
    const prefix = target.title.toLowerCase().split(/\s+/).slice(0, 3).join(" ");
    const results = querySearchIndex(docs, prefix);
    expect(results[0]?.doc.id).toBe(target.id);
  });

  it("ranks title matches above body matches", () => {
    const results = querySearchIndex(docs, "volatility");
    const first = results[0]!.doc;
    expect(first.title.toLowerCase()).toContain("volatility");
  });

  it("matches tags", () => {
    const tagged = docs.find((d) => d.tags.length > 0)!;
    const results = querySearchIndex(docs, tagged.tags[0]!);
    expect(results.some((r) => r.doc.id === tagged.id)).toBe(true);
  });

  it("requires all terms to match", () => {
    expect(querySearchIndex(docs, "volatility zzzznonexistent")).toHaveLength(0);
  });

  it("returns nothing for an empty query", () => {
    expect(querySearchIndex(docs, "  ")).toHaveLength(0);
  });
});
