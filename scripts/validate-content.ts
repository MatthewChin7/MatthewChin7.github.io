/**
 * Content validation — runs in `prebuild` and CI. Exits non-zero on any
 * violation so bad content can never reach production.
 */
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
} from "../lib/content/schemas";

const ROOT = path.join(__dirname, "..");
const CONTENT = path.join(ROOT, "content");
const TODAY = new Date().toISOString().slice(0, 10);
const errors: string[] = [];

function fail(msg: string) {
  errors.push(msg);
}

interface Doc {
  id: string;
  slug: string;
  file: string;
  draft: boolean;
  related: string[];
  date: string;
  updated?: string;
  series?: string;
  seriesOrder?: number;
  body?: string;
  poster?: string;
}

const docs: Doc[] = [];

function readMdx(dir: string) {
  const full = path.join(CONTENT, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(full, file), "utf8");
      const { data, content } = matter(raw);
      return { file: `${dir}/${file}`, data, body: content };
    });
}

// ---- projects
for (const { file, data, body } of readMdx("projects")) {
  const parsed = projectFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    fail(
      `${file}: invalid frontmatter — ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    );
    continue;
  }
  const p = parsed.data;
  docs.push({
    id: `work/${p.slug}`,
    slug: p.slug,
    file,
    draft: p.draft || p.status === "draft",
    related: p.related,
    date: p.date,
    updated: p.updated,
    body,
  });
}

// ---- notes
for (const { file, data, body } of readMdx("notes")) {
  const parsed = noteFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    fail(
      `${file}: invalid frontmatter — ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    );
    continue;
  }
  const n = parsed.data;
  docs.push({
    id: `notes/${n.slug}`,
    slug: n.slug,
    file,
    draft: n.draft,
    related: n.related,
    date: n.date,
    updated: n.updated,
    series: n.series,
    seriesOrder: n.seriesOrder,
    body,
  });
}

// ---- problems (math questions + solutions)
for (const { file, data, body } of readMdx("problems")) {
  const parsed = problemFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    fail(
      `${file}: invalid frontmatter — ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    );
    continue;
  }
  const p = parsed.data;
  if (body.trim().length === 0) fail(`${file}: problem has an empty solution body`);
  docs.push({
    id: `problems/${p.slug}`,
    slug: p.slug,
    file,
    draft: p.draft,
    related: [],
    date: p.date,
    updated: p.updated,
    body,
  });
}

// ---- marginalia
const marginaliaFile = path.join(CONTENT, "marginalia", "marginalia.json");
if (fs.existsSync(marginaliaFile)) {
  const raw: unknown[] = JSON.parse(fs.readFileSync(marginaliaFile, "utf8"));
  raw.forEach((entry, i) => {
    const parsed = marginaliaSchema.safeParse(entry);
    if (!parsed.success) {
      fail(
        `marginalia[${i}]: ${parsed.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`).join("; ")}`,
      );
      return;
    }
    const m = parsed.data;
    const words = m.body.split(/\s+/).filter(Boolean).length;
    if (words > 500) fail(`marginalia/${m.slug}: body is ${words} words (max 500)`);
    docs.push({
      id: `marginalia/${m.slug}`,
      slug: m.slug,
      file: `marginalia.json[${i}]`,
      draft: m.draft,
      related: m.related,
      date: m.date,
    });
  });
}

// ---- videos
const videosFile = path.join(CONTENT, "videos", "videos.json");
if (fs.existsSync(videosFile)) {
  const raw: unknown[] = JSON.parse(fs.readFileSync(videosFile, "utf8"));
  raw.forEach((entry, i) => {
    const parsed = videoSchema.safeParse(entry);
    if (!parsed.success) {
      fail(
        `videos[${i}]: ${parsed.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`).join("; ")}`,
      );
      return;
    }
    const v = parsed.data;
    if (!v.draft && v.embedId.startsWith("TODO"))
      fail(`videos/${v.slug}: published video has a TODO embedId`);
    docs.push({
      id: `videos/${v.slug}`,
      slug: v.slug,
      file: `videos.json[${i}]`,
      draft: v.draft,
      related: v.related,
      date: v.date,
      poster: v.poster,
    });
  });
}

// ---- reading (standalone list — not part of the content graph)
const readingFile = path.join(CONTENT, "reading", "reading.json");
if (fs.existsSync(readingFile)) {
  const raw: unknown[] = JSON.parse(fs.readFileSync(readingFile, "utf8"));
  const readingSlugs = new Map<string, number>();
  raw.forEach((entry, i) => {
    const parsed = readingSchema.safeParse(entry);
    if (!parsed.success) {
      fail(
        `reading[${i}]: ${parsed.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`).join("; ")}`,
      );
      return;
    }
    const r = parsed.data;
    const prior = readingSlugs.get(r.slug);
    if (prior != null) fail(`reading/${r.slug}: duplicate slug (also reading[${prior}])`);
    readingSlugs.set(r.slug, i);
    if (!r.draft && r.note?.startsWith("Sample entry"))
      fail(`reading/${r.slug}: published book still has placeholder "Sample entry" note`);
    if (r.status === "read" && r.finished && r.finished > TODAY)
      fail(`reading/${r.slug}: finished date ${r.finished} is in the future`);
  });
}

// ---- cross-cutting rules
const seen = new Map<string, string>();
for (const d of docs) {
  const prior = seen.get(d.id);
  if (prior) fail(`duplicate slug: ${d.id} in ${d.file} and ${prior}`);
  seen.set(d.id, d.file);
}

const ids = new Set(docs.map((d) => d.id));
const draftIds = new Set(docs.filter((d) => d.draft).map((d) => d.id));
for (const d of docs) {
  for (const r of d.related) {
    if (!ids.has(r)) fail(`${d.file}: related id "${r}" does not exist`);
    else if (!d.draft && draftIds.has(r))
      console.warn(
        `  note: published ${d.id} relates to draft ${r} (link hidden in prod)`,
      );
  }
  if (d.updated && d.updated < d.date)
    fail(`${d.file}: updated (${d.updated}) is before date (${d.date})`);
}

// series ordering: contiguous from 1, no duplicates (among all notes incl. drafts)
const seriesMap = new Map<string, number[]>();
for (const d of docs)
  if (d.series && d.seriesOrder != null)
    seriesMap.set(d.series, [...(seriesMap.get(d.series) ?? []), d.seriesOrder]);
for (const [name, orders] of seriesMap) {
  const sorted = [...orders].sort((a, b) => a - b);
  if (new Set(orders).size !== orders.length)
    fail(`series "${name}": duplicate seriesOrder values (${orders.join(", ")})`);
  else if (sorted[0] !== 1 || sorted[sorted.length - 1] !== sorted.length)
    fail(`series "${name}": seriesOrder not contiguous from 1 (${sorted.join(", ")})`);
}

// referenced local assets must exist
for (const d of docs) {
  const candidates: string[] = [];
  if (d.poster?.startsWith("/")) candidates.push(d.poster);
  if (d.body) {
    for (const m of d.body.matchAll(
      /(?:src|poster|href)=["'](\/(?:diagrams|images|video-posters)\/[^"']+)["']/g,
    ))
      candidates.push(m[1]!);
    for (const m of d.body.matchAll(/!\[[^\]]*\]\((\/[^)]+)\)/g)) candidates.push(m[1]!);
  }
  for (const asset of candidates) {
    if (!fs.existsSync(path.join(ROOT, "public", asset)))
      fail(`${d.file}: referenced local asset ${asset} not found in public/`);
  }
}

if (errors.length > 0) {
  console.error(`\nContent validation failed with ${errors.length} error(s):\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
} else {
  console.log(`Content validation passed — ${docs.length} documents checked.`);
}
