import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  deleteItem,
  deriveDescription,
  duplicateItem,
  emptyTrash,
  isContentKind,
  listItems,
  listTrash,
  readItem,
  restoreTrash,
  saveItem,
  setDraft,
  slugify,
  wordCount,
} from "@/lib/admin/store";

/**
 * The fixtures below are written into the real content tree (that is what the
 * studio does) and removed again afterwards. Every fixture is a draft, so even
 * a leftover file could not reach production.
 */
const SLUG = "vitest-admin-store-fixture";
const COPY = `${SLUG}-copy`;
const NOTES = path.join(process.cwd(), "content", "notes");
const TRASH = path.join(process.cwd(), "content", ".trash");

const frontmatter = {
  title: "Fixture",
  description: "A fixture written by the admin store test.",
  date: "2026-01-01",
  type: "essay",
  domains: ["mathematics"],
  draft: true,
};

function cleanup() {
  for (const slug of [SLUG, COPY]) {
    fs.rmSync(path.join(NOTES, `${slug}.mdx`), { force: true });
  }
  if (fs.existsSync(TRASH)) {
    for (const file of fs.readdirSync(TRASH)) {
      if (file.includes(SLUG)) fs.rmSync(path.join(TRASH, file), { force: true });
    }
  }
}

afterEach(cleanup);

describe("helpers", () => {
  it("slugifies to kebab-case and drops unsafe characters", () => {
    expect(slugify("Fitting the IV Surface: ATM, RR & BF")).toBe(
      "fitting-the-iv-surface-atm-rr-bf",
    );
    expect(slugify("../../etc/passwd")).toBe("etcpasswd");
  });

  it("derives a description from real prose, never filler", () => {
    expect(
      deriveDescription(
        "## Heading\n\nRealized volatility is not implied volatility. More text.",
      ),
    ).toBe("Realized volatility is not implied volatility.");
    expect(deriveDescription("")).toBe("");
  });

  it("counts words", () => {
    expect(wordCount(" one two  three ")).toBe(3);
    expect(wordCount("")).toBe(0);
  });

  it("recognises content kinds", () => {
    expect(isContentKind("note")).toBe(true);
    expect(isContentKind("blog")).toBe(false);
  });
});

describe("listItems", () => {
  const items = listItems();

  it("covers every content type in the repository", () => {
    expect(items.length).toBeGreaterThan(10);
    for (const kind of ["note", "project", "problem", "musing", "reading", "video"]) {
      expect(items.some((i) => i.kind === kind)).toBe(true);
    }
  });

  it("reports the file each item lives in", () => {
    for (const item of items) {
      expect(item.path.startsWith("content/")).toBe(true);
      expect(item.slug).toBeTruthy();
    }
  });

  it("filters by kind", () => {
    expect(listItems("problem").every((i) => i.kind === "problem")).toBe(true);
  });
});

describe("saveItem", () => {
  it("writes a valid draft and reads it back", () => {
    const result = saveItem("note", SLUG, frontmatter, "Body text.");
    expect(result).toMatchObject({ ok: true, created: true });
    const doc = readItem("note", SLUG);
    expect(doc?.frontmatter.title).toBe("Fixture");
    expect(doc?.body).toBe("Body text.");
    expect(fs.existsSync(path.join(NOTES, `${SLUG}.mdx`))).toBe(true);
  });

  it("refuses frontmatter the build would reject, with field-level issues", () => {
    const result = saveItem("note", SLUG, { ...frontmatter, domains: [] }, "Body.");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues?.[0]?.field).toBe("domains");
    expect(fs.existsSync(path.join(NOTES, `${SLUG}.mdx`))).toBe(false);
  });

  it("refuses a slug already used by another content type", () => {
    const existing = listItems("problem")[0];
    expect(existing).toBeTruthy();
    const result = saveItem("note", existing!.slug, frontmatter, "Body.");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("already used");
  });
});

describe("saveItem conveniences", () => {
  it("derives a missing description from the body's first sentence", () => {
    const { description: _drop, ...withoutDescription } = frontmatter;
    const result = saveItem(
      "note",
      SLUG,
      withoutDescription,
      "Realized volatility is not implied volatility. The rest of the post follows.",
    );
    expect(result.ok).toBe(true);
    expect(readItem("note", SLUG)?.frontmatter.description).toBe(
      "Realized volatility is not implied volatility.",
    );
  });

  it("still refuses when there is no body to derive a description from", () => {
    const { description: _drop, ...withoutDescription } = frontmatter;
    const result = saveItem("note", SLUG, withoutDescription, "");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues?.[0]?.field).toBe("description");
  });
});

describe("draft state, duplication, trash", () => {
  it("publishes and unpublishes without losing the body", () => {
    saveItem("note", SLUG, frontmatter, "Body text.");
    expect(setDraft("note", SLUG, false).ok).toBe(true);
    const published = readItem("note", SLUG);
    expect(published?.frontmatter.draft).toBe(false);
    expect(published?.body).toBe("Body text.");
    expect(setDraft("note", SLUG, true).ok).toBe(true);
    expect(readItem("note", SLUG)?.frontmatter.draft).toBe(true);
  });

  it("duplicates into a new draft slug", () => {
    saveItem("note", SLUG, frontmatter, "Body text.");
    const copy = duplicateItem("note", SLUG);
    expect(copy).toMatchObject({ ok: true, slug: COPY });
    const doc = readItem("note", COPY);
    expect(doc?.frontmatter.draft).toBe(true);
    expect(doc?.frontmatter.title).toBe("Fixture (copy)");
  });

  it("moves a delete into the trash and restores it intact", () => {
    saveItem("note", SLUG, frontmatter, "Body text.");
    expect(deleteItem("note", SLUG).ok).toBe(true);
    expect(readItem("note", SLUG)).toBeNull();

    const trashed = listTrash().find((t) => t.slug === SLUG);
    expect(trashed).toBeTruthy();

    expect(restoreTrash(trashed!.id).ok).toBe(true);
    const restored = readItem("note", SLUG);
    expect(restored?.body).toBe("Body text.");
    expect(listTrash().some((t) => t.slug === SLUG)).toBe(false);
  });

  it("reports a delete of something that is not there", () => {
    const result = deleteItem("note", "vitest-nothing-here");
    expect(result.ok).toBe(false);
  });
});

describe("emptyTrash", () => {
  it("removes what is in the trash", () => {
    const preexisting = listTrash().length;
    saveItem("note", SLUG, frontmatter, "Body text.");
    deleteItem("note", SLUG);
    expect(listTrash().length).toBe(preexisting + 1);
    // Never destroy real trashed work just to exercise the happy path.
    if (preexisting > 0) return;
    expect(emptyTrash().removed).toBe(1);
    expect(listTrash()).toHaveLength(0);
  });
});
