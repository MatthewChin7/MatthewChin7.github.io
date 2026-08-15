import { z } from "zod";
import { DOMAINS, METHODS } from "@/lib/site/domains";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(s)), "unparsable date");

const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "kebab-case only");

export const PROJECT_STATUSES = [
  "complete",
  "ongoing",
  "research",
  "archived",
  "draft",
] as const;

export const NOTE_TYPES = ["essay", "research-note", "explainer", "review"] as const;

export const MARGINALIA_TYPES = [
  "question",
  "observation",
  "book",
  "markets",
  "mathematics",
  "building",
  "personal",
] as const;

export const COVER_VARIANTS = [
  "vol-surface",
  "advection",
  "tensor",
  "orderbook",
  "localization",
  "trace",
  "grid",
  "none",
] as const;

const linkSchema = z.object({
  label: z.string().min(1),
  url: z.url(),
});

export const projectFrontmatterSchema = z.object({
  title: z.string().min(1),
  slug,
  description: z.string().min(1),
  question: z.string().min(1),
  year: z.number().int().min(2015).max(2100),
  date: isoDate,
  updated: isoDate.optional(),
  status: z.enum(PROJECT_STATUSES),
  role: z.string().min(1),
  collaborators: z.array(z.string()).default([]),
  domains: z.array(z.enum(DOMAINS)).min(1),
  methods: z.array(z.enum(METHODS)).min(1),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  order: z.number().int().optional(),
  coverVariant: z.enum(COVER_VARIANTS).default("grid"),
  links: z.array(linkSchema).default([]),
  related: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
});

export const noteFrontmatterSchema = z.object({
  title: z.string().min(1),
  slug,
  description: z.string().min(1),
  date: isoDate,
  updated: isoDate.optional(),
  type: z.enum(NOTE_TYPES),
  domains: z.array(z.enum(DOMAINS)).min(1),
  tags: z.array(z.string()).default([]),
  series: z.string().optional(),
  seriesOrder: z.number().int().positive().optional(),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  coverVariant: z.enum(COVER_VARIANTS).default("none"),
  related: z.array(z.string()).default([]),
  bibliography: z.array(z.string()).default([]),
  canonical: z.url().optional(),
});

export const marginaliaSchema = z.object({
  id: z.string().min(1),
  slug,
  date: isoDate,
  title: z.string().optional(),
  body: z.string().min(1),
  tags: z.array(z.string()).default([]),
  type: z.enum(MARGINALIA_TYPES),
  related: z.array(z.string()).default([]),
  externalUrl: z.url().optional(),
  draft: z.boolean().default(false),
});

export const PROBLEM_DIFFICULTIES = ["warmup", "medium", "hard", "olympiad"] as const;

/**
 * A math problem: a question (`prompt`, math-enabled) in frontmatter and the
 * worked solution in the MDX body. Both render through the KaTeX pipeline.
 */
export const problemFrontmatterSchema = z.object({
  title: z.string().min(1),
  slug,
  prompt: z.string().min(1),
  date: isoDate,
  updated: isoDate.optional(),
  topic: z.string().min(1),
  difficulty: z.enum(PROBLEM_DIFFICULTIES).default("medium"),
  source: z.string().optional(),
  tags: z.array(z.string()).default([]),
  /** Formatted references, in citation order. Rendered under the solution. */
  bibliography: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
});

/**
 * A standalone MDX page (content/pages/*.mdx) such as /now. Pages carry no
 * taxonomy — they are edited in place rather than listed anywhere.
 */
export const pageFrontmatterSchema = z.object({
  title: z.string().min(1),
  slug: slug.optional(),
  updated: isoDate.optional(),
  description: z.string().optional(),
});

export const READING_STATUSES = ["reading", "read", "to-read"] as const;

export const readingSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  slug,
  status: z.enum(READING_STATUSES),
  /** Local cover image path, rooted in /public. */
  cover: z.string().startsWith("/").optional(),
  /** When a "read" book was finished. */
  finished: isoDate.optional(),
  /** When a "reading" book was started. */
  started: isoDate.optional(),
  /** A short, first-person note — conservative language, no invented claims. */
  note: z.string().optional(),
  link: z.url().optional(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
});

export const videoChapterSchema = z.object({
  /** Seconds from start. */
  t: z.number().min(0),
  label: z.string().min(1),
});

export const videoSchema = z.object({
  title: z.string().min(1),
  slug,
  description: z.string().min(1),
  date: isoDate,
  /** "MM:SS" or "H:MM:SS" */
  duration: z.string().regex(/^(\d+:)?[0-5]?\d:[0-5]\d$/),
  provider: z.enum(["youtube", "vimeo", "local"]),
  embedId: z.string().min(1),
  poster: z.string().optional(),
  chapters: z.array(videoChapterSchema).default([]),
  transcript: z.string().optional(),
  tags: z.array(z.string()).default([]),
  related: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
});

export type ProblemFrontmatter = z.infer<typeof problemFrontmatterSchema>;
export type PageFrontmatter = z.infer<typeof pageFrontmatterSchema>;
export type ProjectFrontmatter = z.infer<typeof projectFrontmatterSchema>;
export type NoteFrontmatter = z.infer<typeof noteFrontmatterSchema>;
export type MarginaliaEntry = z.infer<typeof marginaliaSchema>;
export type VideoEntry = z.infer<typeof videoSchema>;
export type VideoChapter = z.infer<typeof videoChapterSchema>;
export type ReadingEntry = z.infer<typeof readingSchema>;
