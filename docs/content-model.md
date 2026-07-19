# Content model

All content is repository-based. Zod schemas in `lib/content/schemas.ts`
are the single source of truth; `scripts/validate-content.ts` (run in
`prebuild` and CI) fails the build on violations.

## Folders

```
content/
  projects/    *.mdx   frontmatter: ProjectFrontmatter
  notes/       *.mdx   frontmatter: NoteFrontmatter
  marginalia/  marginalia.json   MarginaliaEntry[]  (JSON so /admin can append)
  videos/      videos.json       VideoEntry[]       (JSON so /admin can append)
  pages/       about.mdx, now.mdx
  resume/      resume.ts         ResumeData
```

## Shared vocabularies

- `Domain`: markets · mathematics · machine-learning · physical-systems ·
  startups · essays
- `Method`: regression · simulation · pde · optimization ·
  machine-learning · data-engineering · market-microstructure · valuation ·
  statistical-inference · software-engineering
- `ProjectStatus`: complete · ongoing · research · archived · draft
- `NoteType`: essay · research-note · explainer · review
- `MarginaliaType`: question · observation · book · markets · mathematics ·
  building · personal

## Schemas (abbreviated — see lib/content/schemas.ts)

**Project**: title, slug, description, question, year, date, updated?,
status, role, collaborators?, domains[], methods[], tags[], featured?,
order?, coverVariant, links?{label,url}[], related?[], draft?

**Note**: title, slug, description, date, updated?, type, domains[],
tags[], series?, seriesOrder?, featured?, draft?, coverVariant?,
related?[], bibliography?[], canonical?

**Marginalia**: id, slug, date, title?, body (markdown, ≤500 words), tags[],
type, related?[], externalUrl?, draft?

**Video**: title, slug, description, date, duration ("MM:SS"), provider
(youtube|vimeo|local), embedId, poster?, chapters{t,label}[],
transcript?, tags[], related?[], draft?

**Resume**: structured sections (education, experience, research, projects,
leadership, skills, interests) each with `detail?: string[]` lines shown
only in detailed mode.

## Derived data (lib/content/\*)

- Reading time (238 wpm on stripped MDX body)
- Excerpts (first paragraph, stripped)
- Tag and domain counts; year archives
- Search index (`lib/search/build-index.ts`) — tokenized title,
  description, tags, body
- Atlas graph (`lib/atlas/build-graph.ts`) — nodes from all published
  content + topic nodes from tags with ≥2 items; edges from explicit
  `related` (weight 3), series (2), shared tags (1)
- Related-content suggestions: explicit `related` first, then shared-tag
  score; ties broken by recency

## Validation rules (build-failing)

duplicate slugs (global across types) · invalid/unparsable dates ·
`updated` earlier than `date` · missing required fields · `related`
pointing to nonexistent ids · published content whose `related` points at
a draft · series with duplicate or non-contiguous `seriesOrder` · local
asset paths (poster, links to /public) that don't exist on disk ·
marginalia body over 500 words

## Authoring

`pnpm new:note`, `pnpm new:project`, `pnpm new:musing` run
`scripts/new-content.ts`, which prompts for metadata and writes a stub
with valid frontmatter. See README §Authoring.

Drafts: `draft: true` keeps content out of production pages, search, RSS,
sitemap, OG, and the Atlas. In development they render with a DRAFT mark.
