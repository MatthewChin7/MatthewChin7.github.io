import { describe, expect, it } from "vitest";
import {
  getAllContent,
  getAllNotes,
  getAllProjects,
  getAllReading,
  getReading,
  contentId,
  findById,
} from "@/lib/content/load";
import { relatedContent } from "@/lib/content/related";
import {
  readingTimeMinutes,
  excerpt,
  formatDate,
  formatDateCompact,
  stripMarkdown,
} from "@/lib/content/derive";
import { extractToc } from "@/lib/content/toc";

describe("content loading", () => {
  it("derives reading time and an excerpt for every item it loads", () => {
    // Counts are not the assertion — content comes and goes as it is written
    // and retired. What must hold is that nothing loads without its derived
    // fields, whatever the archive currently contains.
    const items = [...getAllProjects(), ...getAllNotes()];
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.readingTime).toBeGreaterThan(0);
      expect(item.excerpt.length).toBeGreaterThan(0);
    }
  });

  it("has globally unique content ids", () => {
    const ids = getAllContent().map(contentId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves every id it hands out, and nothing else", () => {
    for (const item of getAllContent()) {
      expect(findById(contentId(item))).toBe(item);
    }
    expect(findById("nowhere/nothing")).toBeUndefined();
  });

  it("resolves reading entries for review pages", () => {
    for (const book of getAllReading()) {
      expect(getReading(book.slug)?.title).toBe(book.title);
    }
    expect(getReading("not-a-book")).toBeUndefined();
  });
});

describe("relatedContent", () => {
  it("ranks explicit relations above inferred tag matches", () => {
    // Any item that names relations will do — the ordering rule is the point,
    // not which post happens to carry it.
    const withRelations = getAllContent().filter(
      (i) => "related" in i && Array.isArray(i.related) && i.related.length > 0,
    );
    expect(withRelations.length).toBeGreaterThan(0);
    for (const item of withRelations) {
      const explicit = (item as { related: string[] }).related;
      const ids = relatedContent(item, 8).map(contentId);
      // Explicit relations come first, in frontmatter order.
      expect(ids.slice(0, explicit.length)).toEqual(explicit);
    }
  });

  it("never returns the item itself", () => {
    for (const item of getAllContent()) {
      const ids = relatedContent(item, 8).map(contentId);
      expect(ids).not.toContain(contentId(item));
    }
  });
});

describe("derive", () => {
  it("computes reading time from word count", () => {
    expect(readingTimeMinutes("word ".repeat(238))).toBe(1);
    expect(readingTimeMinutes("word ".repeat(1200))).toBe(5);
  });

  it("strips markdown and math", () => {
    const s = stripMarkdown("# Title\n\nSome **bold** and $x^2$ and `code`.");
    expect(s).not.toContain("#");
    expect(s).not.toContain("**");
    expect(s).not.toContain("$");
  });

  it("builds excerpts capped at a word boundary", () => {
    const e = excerpt("alpha ".repeat(100), 50);
    expect(e.length).toBeLessThanOrEqual(52);
    expect(e.endsWith("…")).toBe(true);
  });

  it("formats dates in UTC", () => {
    expect(formatDate("2026-01-02")).toBe("Jan 02, 2026");
    expect(formatDateCompact("2026-01-02")).toBe("2026.01.02");
  });
});

describe("extractToc", () => {
  it("extracts h2/h3, skipping code fences, deduplicating ids", () => {
    const toc = extractToc(
      "## Alpha\ntext\n### Beta\n```\n## not a heading\n```\n## Alpha\n",
    );
    expect(toc).toEqual([
      { id: "alpha", text: "Alpha", level: 2 },
      { id: "beta", text: "Beta", level: 3 },
      { id: "alpha-1", text: "Alpha", level: 2 },
    ]);
  });
});
