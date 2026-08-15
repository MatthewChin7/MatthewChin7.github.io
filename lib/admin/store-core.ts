/**
 * Admin content store — the read/write half of the studio.
 *
 * Every write goes through a Zod schema before it touches storage, so the
 * studio can never leave `content/` in a state that would fail
 * `pnpm validate:content` (and therefore the build). Deletes move the item
 * into `content/.trash/` rather than unlinking it, so nothing is lost to a
 * mis-click.
 *
 * All of this logic is storage-agnostic: it runs against a {@link Vfs}, which
 * is the working tree under `pnpm dev` and an in-memory snapshot of the repo
 * when the studio runs in the browser on the deployed site. `lib/admin/store`
 * binds it to Node for the dev route and the unit tests.
 */
import matter from "gray-matter";
import { z } from "zod";
import {
  marginaliaSchema,
  noteFrontmatterSchema,
  pageFrontmatterSchema,
  problemFrontmatterSchema,
  projectFrontmatterSchema,
  readingSchema,
  videoSchema,
} from "@/lib/content/schemas";
import { baseName, extName, joinPath, type Vfs } from "@/lib/admin/vfs";

const CONTENT = "content";
const TRASH = `${CONTENT}/.trash`;
const LATEX = `${CONTENT}/latex`;
const PUBLIC = "public";

export const CONTENT_KINDS = [
  "note",
  "problem",
  "project",
  "musing",
  "video",
  "reading",
  "page",
] as const;

export type ContentKind = (typeof CONTENT_KINDS)[number];

export function isContentKind(v: unknown): v is ContentKind {
  return typeof v === "string" && (CONTENT_KINDS as readonly string[]).includes(v);
}

type Frontmatter = Record<string, unknown>;

interface MdxStore {
  storage: "mdx";
  dir: string;
  schema: z.ZodType<Frontmatter>;
  label: string;
  /** Public URL for a published item, or null when it has no detail page. */
  url: (slug: string) => string | null;
}

interface JsonStore {
  storage: "json";
  file: string;
  schema: z.ZodType<Frontmatter>;
  label: string;
  url: (slug: string) => string | null;
}

const STORES: Record<ContentKind, MdxStore | JsonStore> = {
  note: {
    storage: "mdx",
    dir: "notes",
    schema: noteFrontmatterSchema as unknown as z.ZodType<Frontmatter>,
    label: "Post",
    url: (s) => `/notes/${s}`,
  },
  problem: {
    storage: "mdx",
    dir: "problems",
    schema: problemFrontmatterSchema as unknown as z.ZodType<Frontmatter>,
    label: "Problem",
    url: (s) => `/problems/${s}`,
  },
  project: {
    storage: "mdx",
    dir: "projects",
    schema: projectFrontmatterSchema as unknown as z.ZodType<Frontmatter>,
    label: "Portfolio piece",
    url: (s) => `/work/${s}`,
  },
  page: {
    storage: "mdx",
    dir: "pages",
    schema: pageFrontmatterSchema as unknown as z.ZodType<Frontmatter>,
    label: "Page",
    url: (s) => (s === "now" ? "/now" : null),
  },
  musing: {
    storage: "json",
    file: "marginalia/marginalia.json",
    schema: marginaliaSchema as unknown as z.ZodType<Frontmatter>,
    label: "Musing",
    url: (s) => `/marginalia/${s}`,
  },
  video: {
    storage: "json",
    file: "videos/videos.json",
    schema: videoSchema as unknown as z.ZodType<Frontmatter>,
    label: "Video",
    url: (s) => `/videos/${s}`,
  },
  reading: {
    storage: "json",
    file: "reading/reading.json",
    schema: readingSchema as unknown as z.ZodType<Frontmatter>,
    label: "Book",
    url: () => "/reading",
  },
};

export function storeLabel(kind: ContentKind): string {
  return STORES[kind].label;
}

/* ————————————————————————————————————————————————————————————————
   Pure helpers — no storage involved
   ———————————————————————————————————————————————————————————————— */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}

/** Guard against `..` and absolute paths arriving from the client. */
function safeSlug(slug: string): string {
  const clean = slugify(slug);
  if (!clean) throw new Error("A slug is required.");
  return clean;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** A real one-line description taken from the body — never filler text. */
export function deriveDescription(body: string): string {
  const prose = body
    .replace(/^---[\s\S]*?---/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6} .*$/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/[#>*_`[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!prose) return "";
  const sentence = /^(.{20,180}?[.!?])\s/.exec(prose + " ");
  const text = sentence ? sentence[1]! : prose.slice(0, 160);
  return text.trim();
}

export function wordCount(body: string): number {
  return body.trim() ? body.trim().split(/\s+/).length : 0;
}

export const MAIN_TEX = "main.tex";
export const BIB_FILE = "references.bib";

const MEDIA_DIRS = ["images", "books", "video-posters"];

/**
 * The prefix each kind uses in a `related` id. Reading lists and pages are not
 * part of the content graph, so nothing can point at them.
 */
const GRAPH_PREFIX: Partial<Record<ContentKind, string>> = {
  project: "work",
  note: "notes",
  problem: "problems",
  musing: "marginalia",
  video: "videos",
};

/** The id other content uses to refer to this item, if it can be referred to. */
function globalId(kind: ContentKind, slug: string): string | null {
  const prefix = GRAPH_PREFIX[kind];
  return prefix ? `${prefix}/${slug}` : null;
}

/** Only these extensions are writable, and only inside the project folder. */
function safeFileName(name: string): string {
  const base = name.replace(/\\/g, "/").replace(/\.\.+/g, "").replace(/^\/+/, "");
  if (!/^[\w./-]+$/.test(base) || !/\.(tex|bib|sty|txt)$/.test(base))
    throw new Error(`Unsupported file name "${name}" — use .tex, .bib, .sty or .txt.`);
  return base;
}

function titleOf(kind: ContentKind, data: Frontmatter, slug: string): string {
  const t = data.title;
  if (typeof t === "string" && t.trim()) return t;
  if (kind === "musing" && typeof data.body === "string")
    return data.body.split("\n")[0]?.slice(0, 60) ?? slug;
  return slug;
}

function zodIssues(err: z.ZodError): { field: string; message: string }[] {
  return err.issues.map((i) => ({
    field: i.path.join(".") || "(root)",
    message: i.message,
  }));
}

/* ————————————————————————————————————————————————————————————————
   Shared shapes
   ———————————————————————————————————————————————————————————————— */

export interface AdminItem {
  kind: ContentKind;
  slug: string;
  title: string;
  date: string;
  draft: boolean;
  /** Repo-relative path, shown in the UI so writes are never a mystery. */
  path: string;
  url: string | null;
  words: number;
  /** True when a LaTeX source project backs this item. */
  latex: boolean;
  updated?: string;
}

export interface ItemDoc {
  kind: ContentKind;
  slug: string;
  frontmatter: Frontmatter;
  body: string;
  path: string;
}

export type SaveOutcome =
  | { ok: true; path: string; slug: string; created: boolean }
  | { ok: false; error: string; issues?: { field: string; message: string }[] };

/** An item that pointed at something which was deleted. */
export interface InboundLink {
  kind: ContentKind;
  slug: string;
}

export interface TrashEntry {
  id: string;
  kind: ContentKind;
  slug: string;
  title: string;
  deletedAt: string;
  frontmatter: Frontmatter;
  body: string;
  /**
   * Who linked to this item when it was deleted. Those links are stripped so
   * the build stays green; keeping the list here is what lets a restore put
   * them back instead of silently losing the relationships.
   */
  inbound?: InboundLink[];
}

export interface MediaFile {
  path: string;
  name: string;
  bytes: number;
  modified: string;
}

export type AdminStore = ReturnType<typeof createStore>;

/* ————————————————————————————————————————————————————————————————
   The store
   ———————————————————————————————————————————————————————————————— */

export function createStore(vfs: Vfs) {
  const mdxDir = (store: MdxStore) => joinPath(CONTENT, store.dir);
  const latexDir = (slug: string) => joinPath(LATEX, safeSlug(slug));

  function readJsonFile(store: JsonStore): Frontmatter[] {
    const file = joinPath(CONTENT, store.file);
    if (!vfs.exists(file)) return [];
    const parsed: unknown = JSON.parse(vfs.readFile(file));
    return Array.isArray(parsed) ? (parsed as Frontmatter[]) : [];
  }

  function writeJsonFile(store: JsonStore, entries: Frontmatter[]) {
    vfs.writeFile(joinPath(CONTENT, store.file), JSON.stringify(entries, null, 2) + "\n");
  }

  function fileNames(dir: string): string[] {
    return vfs
      .readdir(dir)
      .filter((e) => !e.isDirectory)
      .map((e) => e.name);
  }

  /* ——— LaTeX projects — content/latex/<slug>/ ——— */

  function hasLatexProject(slug: string): boolean {
    try {
      return vfs.exists(joinPath(latexDir(slug), MAIN_TEX));
    } catch {
      return false;
    }
  }

  function readLatexProject(slug: string): Record<string, string> | null {
    const dir = latexDir(slug);
    if (!vfs.exists(dir)) return null;
    const files: Record<string, string> = {};
    const walk = (current: string, prefix = "") => {
      for (const entry of vfs.readdir(current)) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory) walk(joinPath(current, entry.name), rel);
        else if (/\.(tex|bib|sty|txt)$/.test(entry.name))
          files[rel] = vfs.readFile(joinPath(current, entry.name));
      }
    };
    walk(dir);
    return files;
  }

  /** Every LaTeX project folder in the repo, whether or not a post uses it. */
  function listLatexProjects(): string[] {
    if (!vfs.exists(LATEX)) return [];
    return vfs
      .readdir(LATEX)
      .filter((e) => e.isDirectory && vfs.exists(joinPath(LATEX, e.name, MAIN_TEX)))
      .map((e) => e.name);
  }

  /** Discard a LaTeX project folder entirely (used when its post is deleted). */
  function deleteLatexProject(slug: string) {
    const dir = latexDir(slug);
    if (vfs.exists(dir)) vfs.removeDir(dir);
  }

  function saveLatexProject(
    slug: string,
    files: Record<string, string>,
  ): { ok: true; path: string } | { ok: false; error: string } {
    const dir = latexDir(slug);
    try {
      for (const [name, content] of Object.entries(files)) {
        vfs.writeFile(joinPath(dir, safeFileName(name)), content);
      }
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
    return { ok: true, path: `content/latex/${safeSlug(slug)}/` };
  }

  function deleteLatexFile(slug: string, name: string): { ok: boolean; error?: string } {
    try {
      vfs.removeFile(joinPath(latexDir(slug), safeFileName(name)));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  function renameLatexProject(from: string, to: string) {
    const src = latexDir(from);
    const dest = latexDir(to);
    if (src === dest || !vfs.exists(src)) return;
    vfs.rename(src, dest);
  }

  /* ——— Cross-references ——— */

  /**
   * Rewrite one item's `related` list in place.
   *
   * Deliberately not routed through `saveItem`: this is a repair to somebody
   * else's file, so it must not re-validate their frontmatter, stamp
   * `updated`, or refuse because of a problem that was already there.
   */
  function editRelated(
    kind: ContentKind,
    slug: string,
    edit: (related: string[]) => string[],
  ): boolean {
    const store = STORES[kind];

    if (store.storage === "mdx") {
      const file = joinPath(mdxDir(store), `${slug}.mdx`);
      if (!vfs.exists(file)) return false;
      const { data, content } = matter(vfs.readFile(file));
      const before = Array.isArray(data.related) ? (data.related as string[]) : [];
      const after = edit(before);
      if (after.length === before.length && after.every((r, i) => r === before[i]))
        return false;
      const next: Frontmatter = { ...data };
      if (after.length > 0) next.related = after;
      else delete next.related;
      vfs.writeFile(file, matter.stringify(`\n${content.trim()}\n`, next));
      return true;
    }

    const entries = readJsonFile(store);
    const entry = entries.find((e) => e.slug === slug);
    if (!entry) return false;
    const before = Array.isArray(entry.related) ? (entry.related as string[]) : [];
    const after = edit(before);
    if (after.length === before.length && after.every((r, i) => r === before[i]))
      return false;
    if (after.length > 0) entry.related = after;
    else delete entry.related;
    writeJsonFile(store, entries);
    return true;
  }

  /**
   * Strip a global id from every item that refers to it, and report who did.
   *
   * A dangling `related` id fails `pnpm validate:content`, which fails the
   * build — so deleting an item has to take its inbound links with it.
   */
  function pruneRelated(id: string): InboundLink[] {
    const pruned: InboundLink[] = [];
    for (const item of listItems()) {
      if (
        editRelated(item.kind, item.slug, (related) => related.filter((r) => r !== id))
      ) {
        pruned.push({ kind: item.kind, slug: item.slug });
      }
    }
    return pruned;
  }

  /* ——— Listing ——— */

  function listItems(kind?: ContentKind): AdminItem[] {
    const kinds = kind ? [kind] : CONTENT_KINDS;
    const out: AdminItem[] = [];

    for (const k of kinds) {
      const store = STORES[k];
      if (store.storage === "mdx") {
        const dir = mdxDir(store);
        if (!vfs.exists(dir)) continue;
        for (const file of fileNames(dir).filter((f) => f.endsWith(".mdx"))) {
          const raw = vfs.readFile(joinPath(dir, file));
          const { data, content } = matter(raw);
          const slug = (data.slug as string | undefined) ?? file.replace(/\.mdx$/, "");
          out.push({
            kind: k,
            slug,
            title: titleOf(k, data, slug),
            date: (data.date as string | undefined) ?? "",
            draft: Boolean(data.draft),
            path: `content/${store.dir}/${file}`,
            url: store.url(slug),
            words: wordCount(content),
            latex: hasLatexProject(slug),
            updated: data.updated as string | undefined,
          });
        }
      } else {
        for (const entry of readJsonFile(store)) {
          const slug = String(entry.slug ?? "");
          if (!slug) continue;
          out.push({
            kind: k,
            slug,
            title: titleOf(k, entry, slug),
            date:
              (entry.date as string | undefined) ??
              (entry.finished as string | undefined) ??
              "",
            draft: Boolean(entry.draft),
            path: `content/${store.file}`,
            url: store.url(slug),
            words: wordCount(String(entry.body ?? entry.note ?? entry.description ?? "")),
            latex: false,
          });
        }
      }
    }

    return out.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
  }

  /* ——— Read / write / delete ——— */

  function readItem(kind: ContentKind, slugInput: string): ItemDoc | null {
    const slug = safeSlug(slugInput);
    const store = STORES[kind];
    if (store.storage === "mdx") {
      const file = joinPath(mdxDir(store), `${slug}.mdx`);
      if (!vfs.exists(file)) return null;
      const { data, content } = matter(vfs.readFile(file));
      return {
        kind,
        slug,
        frontmatter: data,
        body: content.trim(),
        path: `content/${store.dir}/${slug}.mdx`,
      };
    }
    const entry = readJsonFile(store).find((e) => e.slug === slug);
    if (!entry) return null;
    const { body, ...rest } = entry;
    return {
      kind,
      slug,
      frontmatter: rest,
      body: typeof body === "string" ? body : "",
      path: `content/${store.file}`,
    };
  }

  /**
   * Create or update an item. `frontmatter` is validated against the same
   * schema the build uses, so an invalid save is refused with field-level
   * errors instead of producing a red build later.
   */
  function saveItem(
    kind: ContentKind,
    slugInput: string,
    frontmatter: Frontmatter,
    body: string,
  ): SaveOutcome {
    let slug: string;
    try {
      slug = safeSlug(slugInput);
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
    const store = STORES[kind];
    const data: Frontmatter = { ...frontmatter, slug };

    // JSON-backed kinds keep the prose in the record itself (a musing's
    // `body`), so it has to be present before the schema sees it. Without
    // this, anything that round-trips through readItem — publishing,
    // duplicating, restoring from the trash — hands back frontmatter with the
    // body stripped out and is rejected for a field the author never touched.
    if (store.storage === "json" && body.trim()) data.body = body.trim();

    // A blank description becomes the opening sentence of the body — real
    // prose from the post itself rather than a placeholder.
    if (kind === "note" || kind === "project" || kind === "video") {
      if (!String(data.description ?? "").trim()) {
        const derived = deriveDescription(body);
        if (derived) data.description = derived;
      }
    }
    // Musings carry a stable id; derive it rather than making the author type one.
    if (
      kind === "musing" &&
      !String(data.id ?? "")
        .trim()
        .replace(/-$/, "")
    ) {
      data.id = `m-${String(data.date ?? today())}-${slug}`;
    }

    // Slugs are globally unique across content types.
    const clash = listItems().find((i) => i.slug === slug && i.kind !== kind);
    if (clash) {
      return {
        ok: false,
        error: `The slug "${slug}" is already used by a ${storeLabel(clash.kind).toLowerCase()} (${clash.path}). Slugs are unique across the whole site.`,
      };
    }

    const parsed = store.schema.safeParse(data);
    if (!parsed.success) {
      return {
        ok: false,
        error: "This does not satisfy the content schema yet.",
        issues: zodIssues(parsed.error),
      };
    }

    if (store.storage === "mdx") {
      const file = joinPath(mdxDir(store), `${slug}.mdx`);
      const created = !vfs.exists(file);
      vfs.writeFile(file, matter.stringify(`\n${body.trim()}\n`, parsed.data));
      return { ok: true, path: `content/${store.dir}/${slug}.mdx`, slug, created };
    }

    const entries = readJsonFile(store);
    const idx = entries.findIndex((e) => e.slug === slug);
    const record: Frontmatter = { ...parsed.data };
    if (body.trim()) record.body = body.trim();
    if (idx === -1) entries.unshift(record);
    else entries[idx] = record;
    writeJsonFile(store, entries);
    return { ok: true, path: `content/${store.file}`, slug, created: idx === -1 };
  }

  /** Move an item into content/.trash — recoverable until the trash is emptied. */
  function deleteItem(kind: ContentKind, slugInput: string): SaveOutcome {
    const slug = safeSlug(slugInput);
    const doc = readItem(kind, slug);
    if (!doc)
      return {
        ok: false,
        error: `No ${storeLabel(kind).toLowerCase()} "${slug}" to delete.`,
      };

    const store = STORES[kind];
    if (store.storage === "mdx") {
      vfs.removeFile(joinPath(mdxDir(store), `${slug}.mdx`));
    } else {
      writeJsonFile(
        store,
        readJsonFile(store).filter((e) => e.slug !== slug),
      );
    }

    // Remove the item first, then prune: nothing should still be pointing at
    // it, and pruning walks the listing this delete has just changed.
    const graphId = globalId(kind, slug);
    const inbound = graphId ? pruneRelated(graphId) : [];

    const id = `${kind}__${slug}__${Date.now()}`;
    const record: TrashEntry = {
      id,
      kind,
      slug,
      title: titleOf(kind, doc.frontmatter, slug),
      deletedAt: new Date().toISOString(),
      frontmatter: doc.frontmatter,
      body: doc.body,
      ...(inbound.length > 0 ? { inbound } : {}),
    };
    vfs.writeFile(joinPath(TRASH, `${id}.json`), JSON.stringify(record, null, 2) + "\n");

    return { ok: true, path: `content/.trash/${id}.json`, slug, created: false };
  }

  function listTrash(): Omit<TrashEntry, "frontmatter" | "body">[] {
    if (!vfs.exists(TRASH)) return [];
    return fileNames(TRASH)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const record = JSON.parse(vfs.readFile(joinPath(TRASH, f))) as TrashEntry;
        const { frontmatter: _f, body: _b, ...rest } = record;
        return rest;
      })
      .sort((a, b) => (a.deletedAt > b.deletedAt ? -1 : 1));
  }

  function restoreTrash(id: string): SaveOutcome {
    const file = joinPath(TRASH, `${baseName(id)}.json`);
    if (!vfs.exists(file))
      return { ok: false, error: "That trashed item no longer exists." };
    const record = JSON.parse(vfs.readFile(file)) as TrashEntry;
    const result = saveItem(record.kind, record.slug, record.frontmatter, record.body);
    if (!result.ok) return result;

    // Put back the links that were stripped when it was deleted, so a restore
    // returns the item to the graph rather than to an island.
    const graphId = globalId(record.kind, result.slug);
    if (graphId) {
      for (const link of record.inbound ?? []) {
        editRelated(link.kind, link.slug, (related) =>
          related.includes(graphId) ? related : [...related, graphId],
        );
      }
    }

    vfs.removeFile(file);
    return result;
  }

  function emptyTrash(): { removed: number } {
    if (!vfs.exists(TRASH)) return { removed: 0 };
    const files = fileNames(TRASH).filter((f) => f.endsWith(".json"));
    for (const f of files) vfs.removeFile(joinPath(TRASH, f));
    return { removed: files.length };
  }

  /** Flip `draft` (and, for projects, the paired `status` field). */
  function setDraft(kind: ContentKind, slug: string, draft: boolean): SaveOutcome {
    const doc = readItem(kind, slug);
    if (!doc)
      return { ok: false, error: `No ${storeLabel(kind).toLowerCase()} "${slug}".` };
    const frontmatter: Frontmatter = { ...doc.frontmatter, draft };
    if (kind === "project") {
      frontmatter.status = draft
        ? "draft"
        : doc.frontmatter.status === "draft"
          ? "complete"
          : doc.frontmatter.status;
    }
    if (!draft) frontmatter.updated = today();
    return saveItem(kind, slug, frontmatter, doc.body);
  }

  function duplicateItem(kind: ContentKind, slug: string): SaveOutcome {
    const doc = readItem(kind, slug);
    if (!doc)
      return { ok: false, error: `No ${storeLabel(kind).toLowerCase()} "${slug}".` };
    let copySlug = `${slug}-copy`;
    let n = 2;
    const taken = new Set(listItems().map((i) => i.slug));
    while (taken.has(copySlug)) copySlug = `${slug}-copy-${n++}`;
    const title = `${doc.frontmatter.title ?? slug} (copy)`;
    const frontmatter: Frontmatter = {
      ...doc.frontmatter,
      title,
      slug: copySlug,
      date: today(),
      draft: true,
    };
    if (kind === "project") frontmatter.status = "draft";
    if (kind === "musing") frontmatter.id = `m-${today()}-${copySlug}`;
    return saveItem(kind, copySlug, frontmatter, doc.body);
  }

  /* ——— Media ——— */

  function listMedia(): MediaFile[] {
    const out: MediaFile[] = [];
    for (const dir of MEDIA_DIRS) {
      const full = joinPath(PUBLIC, dir);
      if (!vfs.exists(full)) continue;
      for (const name of fileNames(full)) {
        const stat = vfs.stat(joinPath(full, name));
        if (!stat) continue;
        out.push({
          path: `/${dir}/${name}`,
          name,
          bytes: stat.size,
          modified: stat.modified,
        });
      }
    }
    const resume = vfs.stat(joinPath(PUBLIC, "resume.pdf"));
    if (resume) {
      out.push({
        path: "/resume.pdf",
        name: "resume.pdf",
        bytes: resume.size,
        modified: resume.modified,
      });
    }
    return out.sort((a, b) => (a.modified > b.modified ? -1 : 1));
  }

  function deleteMedia(target: string): { ok: boolean; error?: string } {
    const rel = target.replace(/^\/+/, "");
    const allowed =
      MEDIA_DIRS.some((d) => rel.startsWith(`${d}/`)) || rel === "resume.pdf";
    if (!allowed || rel.includes(".."))
      return { ok: false, error: "That path is not deletable." };
    const full = joinPath(PUBLIC, rel);
    if (!vfs.exists(full)) return { ok: false, error: "That file no longer exists." };
    vfs.removeFile(full);
    return { ok: true };
  }

  /** Which files a media item is referenced from — checked before deleting. */
  function mediaUsage(target: string): string[] {
    const hits: string[] = [];
    const scan = (dir: string) => {
      if (!vfs.exists(dir)) return;
      for (const entry of vfs.readdir(dir)) {
        const full = joinPath(dir, entry.name);
        if (entry.isDirectory) scan(full);
        else if (/\.(mdx|json|ts|tsx)$/.test(entry.name)) {
          if (vfs.readFile(full).includes(target)) hits.push(full);
        }
      }
    };
    scan(CONTENT);
    return hits;
  }

  /**
   * Where an upload lands. Kept here so the dev route and the browser studio
   * agree on the destination and on which files are acceptable.
   */
  function mediaDestination(
    target: string,
    fileName: string,
    preferredName = "",
  ): { ok: true; path: string } | { ok: false; error: string } {
    const IMAGE_DIRS: Record<string, string> = {
      image: "images",
      cover: "books",
      poster: "video-posters",
    };
    if (target === "resume") {
      if (!fileName.toLowerCase().endsWith(".pdf"))
        return { ok: false, error: "The CV must be a PDF." };
      return { ok: true, path: joinPath(PUBLIC, "resume.pdf") };
    }
    const dir = IMAGE_DIRS[target];
    if (!dir) return { ok: false, error: "Unknown upload target." };
    const ext = extName(fileName).toLowerCase();
    // The caller can name the file after its item (a book slug, say) so the
    // upload lands as /books/<slug>.jpg rather than whatever the camera called it.
    const base =
      slugify(preferredName) || slugify(fileName.slice(0, fileName.length - ext.length));
    if (!base) return { ok: false, error: "That file name has no usable characters." };
    const safe = `${base}${ext}`;
    if (!/\.(png|jpe?g|webp|svg|avif)$/.test(safe))
      return { ok: false, error: "Use a PNG, JPEG, WebP, AVIF or SVG image." };
    return { ok: true, path: joinPath(PUBLIC, dir, safe) };
  }

  /** Repo-relative path → the public URL the site serves it at. */
  function publicUrl(repoPath: string): string {
    return repoPath.startsWith(`${PUBLIC}/`)
      ? repoPath.slice(PUBLIC.length)
      : `/${repoPath}`;
  }

  return {
    vfs,
    pruneRelated,
    listItems,
    readItem,
    saveItem,
    deleteItem,
    listTrash,
    restoreTrash,
    emptyTrash,
    setDraft,
    duplicateItem,
    hasLatexProject,
    readLatexProject,
    listLatexProjects,
    deleteLatexProject,
    saveLatexProject,
    deleteLatexFile,
    renameLatexProject,
    listMedia,
    deleteMedia,
    mediaUsage,
    mediaDestination,
    publicUrl,
  };
}
