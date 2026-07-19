import { describe, expect, it } from "vitest";
import { buildSearchIndex } from "@/lib/search/index";
import { querySearchIndex } from "@/lib/search/query";

describe("search index", () => {
  const docs = buildSearchIndex();

  it("indexes all content kinds plus topics and pages", () => {
    const types = new Set(docs.map((d) => d.type));
    expect(types.has("project")).toBe(true);
    expect(types.has("note")).toBe(true);
    expect(types.has("musing")).toBe(true);
    expect(types.has("topic")).toBe(true);
    expect(types.has("page")).toBe(true);
  });

  it("has no duplicate ids", () => {
    const ids = docs.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("querySearchIndex", () => {
  const docs = buildSearchIndex();

  it("finds a project by title prefix", () => {
    const results = querySearchIndex(docs, "building a btc");
    expect(results[0]?.doc.id).toBe("work/btc-vol-surface");
  });

  it("ranks title matches above body matches", () => {
    const results = querySearchIndex(docs, "volatility");
    const first = results[0]!.doc;
    expect(first.title.toLowerCase()).toContain("volatility");
  });

  it("matches tags", () => {
    const results = querySearchIndex(docs, "svi");
    expect(results.some((r) => r.doc.id === "work/btc-vol-surface")).toBe(true);
  });

  it("requires all terms to match", () => {
    expect(querySearchIndex(docs, "volatility zzzznonexistent")).toHaveLength(0);
  });

  it("returns nothing for an empty query", () => {
    expect(querySearchIndex(docs, "  ")).toHaveLength(0);
  });
});
