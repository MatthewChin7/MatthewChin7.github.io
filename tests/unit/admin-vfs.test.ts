import { describe, expect, it } from "vitest";
import {
  MemoryVfs,
  joinPath,
  baseName,
  extName,
  stemName,
  dirName,
} from "@/lib/admin/vfs";
import { createStore } from "@/lib/admin/store-core";

/**
 * The memory filesystem is what lets the studio run on the deployed static
 * site: the same store logic that writes into the working tree under
 * `pnpm dev` writes into a snapshot of the repo here, and the recorded
 * mutations become one commit. These tests pin the two properties that makes
 * the browser path safe — the store behaves identically, and every write is
 * accounted for.
 */

describe("path helpers", () => {
  it("joins, and strips empty and duplicated separators", () => {
    expect(joinPath("content", "notes", "a.mdx")).toBe("content/notes/a.mdx");
    expect(joinPath("content", "", "a.mdx")).toBe("content/a.mdx");
    expect(joinPath("content/", "/notes")).toBe("content/notes");
  });

  it("splits names the way node:path does for the cases the store uses", () => {
    expect(baseName("content/notes/a.mdx")).toBe("a.mdx");
    expect(dirName("content/notes/a.mdx")).toBe("content/notes");
    expect(extName("content/notes/a.mdx")).toBe(".mdx");
    expect(stemName("content/notes/a.mdx")).toBe("a");
    // A dotfile is a name, not an extension.
    expect(extName(".nojekyll")).toBe("");
  });
});

describe("MemoryVfs", () => {
  it("round-trips files and reports directories as existing", () => {
    const vfs = new MemoryVfs({ "content/notes/a.mdx": "hello" });
    expect(vfs.readFile("content/notes/a.mdx")).toBe("hello");
    expect(vfs.exists("content/notes/a.mdx")).toBe(true);
    expect(vfs.exists("content/notes")).toBe(true);
    expect(vfs.exists("content/other")).toBe(false);
  });

  it("lists a directory's own entries and marks nested ones as directories", () => {
    const vfs = new MemoryVfs({
      "content/notes/a.mdx": "a",
      "content/notes/deep/b.mdx": "b",
      "content/other.json": "[]",
    });
    expect(
      vfs.readdir("content/notes").sort((x, y) => x.name.localeCompare(y.name)),
    ).toEqual([
      { name: "a.mdx", isDirectory: false },
      { name: "deep", isDirectory: true },
    ]);
  });

  it("records every write and delete, and nothing else", () => {
    const vfs = new MemoryVfs({ "content/notes/a.mdx": "a" });
    expect(vfs.changes()).toEqual([]);

    vfs.readFile("content/notes/a.mdx");
    expect(vfs.changes()).toEqual([]);

    vfs.writeFile("content/notes/b.mdx", "b");
    vfs.removeFile("content/notes/a.mdx");
    expect(vfs.changes()).toEqual([
      { path: "content/notes/b.mdx", content: "b" },
      { path: "content/notes/a.mdx", content: null },
    ]);

    vfs.clearChanges();
    expect(vfs.changes()).toEqual([]);
  });

  it("renames a directory as a move of every file beneath it", () => {
    const vfs = new MemoryVfs({
      "content/latex/old/main.tex": "x",
      "content/latex/old/refs/extra.bib": "y",
    });
    vfs.clearChanges();
    vfs.rename("content/latex/old", "content/latex/new");

    expect(vfs.exists("content/latex/old/main.tex")).toBe(false);
    expect(vfs.readFile("content/latex/new/main.tex")).toBe("x");
    expect(vfs.readFile("content/latex/new/refs/extra.bib")).toBe("y");
    // The commit must delete the originals, not just add the copies.
    expect(
      vfs
        .changes()
        .filter((c) => c.content === null)
        .map((c) => c.path)
        .sort(),
    ).toEqual(["content/latex/old/main.tex", "content/latex/old/refs/extra.bib"]);
  });

  it("stats stubbed media without holding its bytes", () => {
    const vfs = new MemoryVfs();
    vfs.addStub("public/images/plot.png", {
      size: 2048,
      modified: "2026-01-01T00:00:00.000Z",
    });
    expect(vfs.exists("public/images/plot.png")).toBe(true);
    expect(vfs.stat("public/images/plot.png")).toEqual({
      size: 2048,
      modified: "2026-01-01T00:00:00.000Z",
    });
    // Reading it is a bug, not a silent empty string.
    expect(() => vfs.readFile("public/images/plot.png")).toThrow(/not.*loaded/i);
  });
});

describe("the store over a memory filesystem", () => {
  const frontmatter = {
    title: "Fixture",
    description: "A fixture written by the memory-store test.",
    date: "2026-01-01",
    type: "essay",
    domains: ["mathematics"],
    draft: true,
  };

  const project = {
    title: "Doomed",
    description: "A project fixture written by the memory-store test.",
    question: "Does deleting this take its inbound links with it?",
    year: 2026,
    date: "2026-01-01",
    status: "draft",
    role: "Sole researcher",
    domains: ["mathematics"],
    methods: ["optimization"],
    draft: true,
  };

  it("saves, lists and reads a note, staging exactly one file for commit", () => {
    const vfs = new MemoryVfs();
    const store = createStore(vfs);

    const saved = store.saveItem(
      "note",
      "memory-fixture",
      frontmatter,
      "Body prose here.",
    );
    expect(saved).toMatchObject({
      ok: true,
      created: true,
      path: "content/notes/memory-fixture.mdx",
    });

    expect(store.listItems("note")).toHaveLength(1);
    expect(store.readItem("note", "memory-fixture")?.body).toBe("Body prose here.");
    expect(vfs.changes().map((c) => c.path)).toEqual([
      "content/notes/memory-fixture.mdx",
    ]);
  });

  it("refuses a save that would fail content validation", () => {
    const store = createStore(new MemoryVfs());
    const result = store.saveItem(
      "note",
      "broken",
      { ...frontmatter, date: "not-a-date" },
      "x",
    );
    expect(result.ok).toBe(false);
  });

  it("moves a delete into the trash and restores it", () => {
    const vfs = new MemoryVfs();
    const store = createStore(vfs);
    store.saveItem("note", "memory-fixture", frontmatter, "Body prose here.");

    const deleted = store.deleteItem("note", "memory-fixture");
    expect(deleted.ok).toBe(true);
    expect(store.listItems("note")).toHaveLength(0);

    const trash = store.listTrash();
    expect(trash).toHaveLength(1);
    expect(store.restoreTrash(trash[0]!.id).ok).toBe(true);
    expect(store.listItems("note")).toHaveLength(1);
    expect(store.listTrash()).toHaveLength(0);
  });

  it("takes inbound related links with it on delete, and puts them back on restore", () => {
    const store = createStore(new MemoryVfs());
    store.saveItem("project", "doomed-project", project, "Body.");
    store.saveItem(
      "note",
      "pointing-note",
      { ...frontmatter, related: ["work/doomed-project"] },
      "Body prose here.",
    );
    expect(store.readItem("note", "pointing-note")?.frontmatter.related).toEqual([
      "work/doomed-project",
    ]);

    // A dangling related id fails content validation, which fails the build.
    store.deleteItem("project", "doomed-project");
    expect(store.readItem("note", "pointing-note")?.frontmatter.related).toBeUndefined();

    const trashed = store.listTrash()[0]!;
    expect(store.restoreTrash(trashed.id).ok).toBe(true);
    expect(store.readItem("note", "pointing-note")?.frontmatter.related).toEqual([
      "work/doomed-project",
    ]);
  });

  it("leaves unrelated links alone when pruning", () => {
    const store = createStore(new MemoryVfs());
    store.saveItem("project", "doomed-project", project, "Body.");
    store.saveItem("note", "other-note", frontmatter, "Body prose here.");
    store.saveItem(
      "note",
      "pointing-note",
      { ...frontmatter, related: ["notes/other-note", "work/doomed-project"] },
      "Body prose here.",
    );

    store.deleteItem("project", "doomed-project");
    expect(store.readItem("note", "pointing-note")?.frontmatter.related).toEqual([
      "notes/other-note",
    ]);
  });

  it("keeps slugs unique across content types", () => {
    const store = createStore(new MemoryVfs());
    store.saveItem("note", "shared-slug", frontmatter, "Body prose here.");
    const clash = store.saveItem(
      "project",
      "shared-slug",
      { ...project, title: "Clash" },
      "Body.",
    );
    expect(clash.ok).toBe(false);
    if (!clash.ok) expect(clash.error).toMatch(/already used/i);
  });

  it("routes uploads to the directory their kind belongs in", () => {
    const store = createStore(new MemoryVfs());
    // Named after the item it illustrates, not after the camera's filename.
    expect(store.mediaDestination("cover", "Cover Photo.JPG", "shreve-vol-ii")).toEqual({
      ok: true,
      path: "public/books/shreve-vol-ii.jpg",
    });
    expect(store.mediaDestination("resume", "notes.txt")).toMatchObject({ ok: false });
    expect(store.mediaDestination("image", "diagram.exe")).toMatchObject({ ok: false });
    expect(store.publicUrl("public/books/x.jpg")).toBe("/books/x.jpg");
  });
});

/**
 * JSON-backed kinds keep their prose inside the record. readItem lifts it out
 * into `body`, so anything that re-saves what readItem returned has to put it
 * back — otherwise publishing a musing fails validation on a field the author
 * never touched.
 */
describe("json-backed kinds round-trip their body", () => {
  const musing = {
    id: "m-1",
    slug: "m-one",
    date: "2026-08-15",
    body: "A thought.",
    type: "observation",
    draft: true,
  };

  it("publishes, duplicates and restores a musing", () => {
    const store = createStore(new MemoryVfs());
    expect(store.saveItem("musing", "m-one", musing, "A thought.").ok).toBe(true);
    expect(store.setDraft("musing", "m-one", false).ok).toBe(true);
    expect(store.readItem("musing", "m-one")?.body).toBe("A thought.");
    expect(store.duplicateItem("musing", "m-one").ok).toBe(true);
    const del = store.deleteItem("musing", "m-one");
    expect(del.ok).toBe(true);
    expect(store.restoreTrash(store.listTrash()[0]!.id).ok).toBe(true);
    expect(store.readItem("musing", "m-one")?.body).toBe("A thought.");
  });
});
