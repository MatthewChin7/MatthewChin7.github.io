# The Signal Archive — matthewchin.com (domain TBD)

Matthew Chin's personal website: a living research atlas of models,
markets, mechanisms, and ideas. Built with Next.js 16 (App Router),
React 19, TypeScript strict, Tailwind CSS 4, MDX, KaTeX, Shiki, and an
original design system ("Signal Archive") documented in `docs/`.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000  (includes /admin studio)
pnpm build        # validates content, then production build
pnpm start        # serve the production build
```

Node ≥ 20 and pnpm ≥ 9 are required (repo pins pnpm via packageManager).

## Edit content

All content lives in `content/` and is validated by Zod schemas
(`lib/content/schemas.ts`) — invalid content fails the build.

| What        | Where                                | Format            |
| ----------- | ------------------------------------ | ----------------- |
| Projects    | `content/projects/*.mdx`             | MDX + frontmatter |
| Notes       | `content/notes/*.mdx`                | MDX + frontmatter |
| Marginalia  | `content/marginalia/marginalia.json` | JSON              |
| Videos      | `content/videos/videos.json`         | JSON              |
| About / Now | `content/pages/*.mdx`                | MDX               |
| Résumé      | `content/resume/resume.ts`           | typed TS          |
| Site facts  | `lib/site/config.ts`                 | typed TS          |

Three ways to author:

1. **`/admin` studio** — run `pnpm dev`, open `/admin`, fill a form.
   Writes drafts into the repo and uploads (CV PDF → `public/resume.pdf`,
   images → `public/images/`). Dev-only; production builds 404 there.
2. **Scaffolding commands** — `pnpm new:note`, `pnpm new:project`,
   `pnpm new:musing` (interactive prompts).
3. **By hand** — copy an existing file; `pnpm validate:content` tells you
   what's wrong.

Everything is created with `draft: true`. Drafts render in dev with a
DRAFT mark and are excluded from production pages, search, RSS, sitemap,
and the Atlas. Remove the flag (and for projects, change `status`) to
publish, then commit and deploy.

MDX components available in articles: Figure, FigureGrid, DiagramFrame,
Aside, MarginNote, Definition, Theorem, Proof, Proposition, Question,
Equation, Quote, DataTable, Callout, VideoEmbed, RelatedLink,
Bibliography, BeforeAfter, Timeline, Metric, UpdateNote, Reflection.
Math via `$…$` / `$$…$$` (KaTeX); code fences highlighted by Shiki.

## Test it

```bash
pnpm typecheck        # tsc --noEmit (strict)
pnpm lint             # eslint
pnpm format:check     # prettier
pnpm test             # vitest unit tests (schemas, graph, search, related)
pnpm validate:content # content integrity (also runs in prebuild)
pnpm test:e2e         # Playwright: flows + axe + visual regression
                      # (builds are served on :3311; run `pnpm build` first)
```

Visual baselines live in `tests/e2e/visual.spec.ts-snapshots/`; refresh
intentionally with `pnpm exec playwright test --update-snapshots`.

## Deploy it

Standard Next.js — deploys to Vercel with zero config (framework preset),
or any Node host via `pnpm build && pnpm start`. Before the first real
deploy:

1. Set the production domain in `lib/site/config.ts` (`site.url`) —
   sitemap, RSS, canonicals, and OG URLs derive from it.
2. Fill the `site.social` URLs (currently empty → hidden in the UI).
3. Replace `public/resume.pdf` (placeholder) with the real CV.
4. Optionally configure `site.analytics` (off by default; no tracking
   ships otherwise).

## Documentation

`docs/` holds the design system (visual-direction), IA, content model,
component map, motion spec, accessibility and performance notes, the
originality log, the visual-review log, and the decision record.
`PROGRESS.md` is the build log. `.claude/` contains working rules for
future Claude Code sessions.
