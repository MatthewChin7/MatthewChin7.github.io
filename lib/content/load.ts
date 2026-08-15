import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  projectFrontmatterSchema,
  noteFrontmatterSchema,
  marginaliaSchema,
  videoSchema,
  readingSchema,
  problemFrontmatterSchema,
  type ProjectFrontmatter,
  type NoteFrontmatter,
  type MarginaliaEntry,
  type VideoEntry,
  type ReadingEntry,
  type ProblemFrontmatter,
} from "@/lib/content/schemas";
import { readingTimeMinutes, excerpt, wordCount } from "@/lib/content/derive";

export const CONTENT_DIR = path.join(process.cwd(), "content");

const includeDrafts = process.env.NODE_ENV !== "production";

function parseOrThrow<R>(
  schema: { parse: (d: unknown) => R },
  data: unknown,
  file: string,
): R {
  try {
    return schema.parse(data);
  } catch (err) {
    throw new Error(`Invalid frontmatter in content file "${file}":\n${String(err)}`);
  }
}

export interface Project extends ProjectFrontmatter {
  body: string;
  readingTime: number;
  excerpt: string;
  kind: "project";
}

export interface Note extends NoteFrontmatter {
  body: string;
  readingTime: number;
  wordCount: number;
  excerpt: string;
  kind: "note";
}

export interface Musing extends MarginaliaEntry {
  kind: "musing";
}

export interface Video extends VideoEntry {
  kind: "video";
}

/**
 * A book on the shelf. Reading entries are a standalone list, not nodes in
 * the content graph — they have no body, relations, or detail page, so they
 * stay out of `getAllContent`, the atlas, and search.
 */
export interface Reading extends ReadingEntry {
  kind: "reading";
}

/**
 * A math problem. Like reading, problems are a standalone list with their own
 * detail pages — they are not nodes in the content graph (atlas/search).
 */
export interface Problem extends ProblemFrontmatter {
  body: string;
  readingTime: number;
  kind: "problem";
}

export type ContentItem = Project | Note | Musing | Video;

function readMdxDir(dir: string): { file: string; data: unknown; body: string }[] {
  const full = path.join(CONTENT_DIR, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(full, file), "utf8");
      const { data, content } = matter(raw);
      return { file, data, body: content };
    });
}

let projectCache: Project[] | null = null;
let noteCache: Note[] | null = null;
let problemCache: Problem[] | null = null;
let musingCache: Musing[] | null = null;
let videoCache: Video[] | null = null;
let readingCache: Reading[] | null = null;

export function getAllProjects(): Project[] {
  projectCache ??= readMdxDir("projects")
    .map(({ file, data, body }) => {
      const fm = parseOrThrow(projectFrontmatterSchema, data, file);
      return {
        ...fm,
        body,
        readingTime: readingTimeMinutes(body),
        excerpt: excerpt(body),
        kind: "project" as const,
      };
    })
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || b.date.localeCompare(a.date));
  return includeDrafts
    ? projectCache
    : projectCache.filter((p) => !p.draft && p.status !== "draft");
}

export function getAllNotes(): Note[] {
  noteCache ??= readMdxDir("notes")
    .map(({ file, data, body }) => {
      const fm = parseOrThrow(noteFrontmatterSchema, data, file);
      return {
        ...fm,
        body,
        readingTime: readingTimeMinutes(body),
        wordCount: wordCount(body),
        excerpt: excerpt(body),
        kind: "note" as const,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  return includeDrafts ? noteCache : noteCache.filter((n) => !n.draft);
}

export function getAllProblems(): Problem[] {
  problemCache ??= readMdxDir("problems")
    .map(({ file, data, body }) => {
      const fm = parseOrThrow(problemFrontmatterSchema, data, file);
      return {
        ...fm,
        body,
        readingTime: readingTimeMinutes(body),
        kind: "problem" as const,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  return includeDrafts ? problemCache : problemCache.filter((p) => !p.draft);
}

export function getProblem(slug: string): Problem | undefined {
  return getAllProblems().find((p) => p.slug === slug);
}

export function getAllMusings(): Musing[] {
  if (!musingCache) {
    const file = path.join(CONTENT_DIR, "marginalia", "marginalia.json");
    const raw: unknown[] = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, "utf8"))
      : [];
    musingCache = raw
      .map((entry) => ({ ...marginaliaSchema.parse(entry), kind: "musing" as const }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  return includeDrafts ? musingCache : musingCache.filter((m) => !m.draft);
}

export function getAllVideos(): Video[] {
  if (!videoCache) {
    const file = path.join(CONTENT_DIR, "videos", "videos.json");
    const raw: unknown[] = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, "utf8"))
      : [];
    videoCache = raw
      .map((entry) => ({ ...videoSchema.parse(entry), kind: "video" as const }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  return includeDrafts ? videoCache : videoCache.filter((v) => !v.draft);
}

export function getAllReading(): Reading[] {
  if (!readingCache) {
    const file = path.join(CONTENT_DIR, "reading", "reading.json");
    const raw: unknown[] = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, "utf8"))
      : [];
    readingCache = raw.map((entry) => ({
      ...readingSchema.parse(entry),
      kind: "reading" as const,
    }));
  }
  return includeDrafts ? readingCache : readingCache.filter((r) => !r.draft);
}

export function getReading(slug: string): Reading | undefined {
  return getAllReading().find((book) => book.slug === slug);
}

export function getProject(slug: string): Project | undefined {
  return getAllProjects().find((p) => p.slug === slug);
}

export function getNote(slug: string): Note | undefined {
  return getAllNotes().find((n) => n.slug === slug);
}

export function getMusing(slug: string): Musing | undefined {
  return getAllMusings().find((m) => m.slug === slug);
}

export function getVideo(slug: string): Video | undefined {
  return getAllVideos().find((v) => v.slug === slug);
}

/** Global id for cross-content relationships: "work/slug", "notes/slug", … */
export function contentId(item: ContentItem): string {
  switch (item.kind) {
    case "project":
      return `work/${item.slug}`;
    case "note":
      return `notes/${item.slug}`;
    case "musing":
      return `marginalia/${item.slug}`;
    case "video":
      return `videos/${item.slug}`;
  }
}

export function contentUrl(item: ContentItem): string {
  return `/${contentId(item)}`;
}

export function contentTitle(item: ContentItem): string {
  if (item.kind === "musing") return item.title ?? excerptOfBody(item.body);
  return item.title;
}

function excerptOfBody(body: string): string {
  return body.length > 64 ? body.slice(0, 61).trimEnd() + "…" : body;
}

export function getAllContent(): ContentItem[] {
  return [...getAllProjects(), ...getAllNotes(), ...getAllMusings(), ...getAllVideos()];
}

export function findById(id: string): ContentItem | undefined {
  return getAllContent().find((item) => contentId(item) === id);
}
