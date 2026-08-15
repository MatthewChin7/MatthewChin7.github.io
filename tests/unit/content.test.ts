import { describe, expect, it } from "vitest";
import {
  getAllContent,
  getAllNotes,
  getAllProjects,
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
  it("loads projects and notes with derived fields", () => {
    const projects = getAllProjects();
    expect(projects.length).toBeGreaterThanOrEqual(5);
    for (const p of projects) {
      expect(p.readingTime).toBeGreaterThan(0);
      expect(p.excerpt.length).toBeGreaterThan(0);
    }
    expect(getAllNotes().length).toBeGreaterThanOrEqual(3);
  });

  it("has globally unique content ids", () => {
    const ids = getAllContent().map(contentId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves ids back to items", () => {
    expect(findById("work/btc-vol-surface")?.kind).toBe("project");
    expect(findById("nowhere/nothing")).toBeUndefined();
  });

  it("resolves reading entries for review pages", () => {
    expect(getReading("hull-options-futures-derivatives")?.author).toBe("John C. Hull");
    expect(getReading("not-a-book")).toBeUndefined();
  });
});

describe("relatedContent", () => {
  it("ranks explicit relations above inferred tag matches", () => {
    const project = getAllProjects().find((p) => p.slug === "btc-vol-surface")!;
    const related = relatedContent(project, 6);
    const relatedIds = related.map(contentId);
    // explicit relations come first, in frontmatter order
    expect(relatedIds.slice(0, project.related.length)).toEqual(project.related);
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
