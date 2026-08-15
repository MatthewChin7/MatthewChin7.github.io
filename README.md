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

1. **`/admin` studio** — create, edit, publish, duplicate, and trash any
   content type; math posts can be written in the Overleaf-style LaTeX
   editor (`content/latex/<slug>/`), which compiles to MDX on save.
   Handles uploads too (CV PDF → `public/resume.pdf`, images →
   `public/images/`). It runs in two places:
   - **Locally** — `pnpm dev`, then `/admin`. Writes into the working
     tree for you to review and commit.
   - **On the deployed site** — `https://matthewchin7.github.io/admin`.
     There is no server on GitHub Pages, so it commits to this repository
     through the GitHub API instead, and the commit redeploys the site.
     It is inert until given a token only you hold; see
     [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

   A _server_ production build (`next start`) still 404s at `/admin` — a
   Node deployment never carries a writable surface.

2. **Scaffolding commands** — `pnpm new:note`, `pnpm new:project`,
   `pnpm new:musing` (interactive prompts).
3. **By hand** — copy an existing file; `pnpm validate:content` tells you
   what's wrong.

Everything is created with `draft: true`. Drafts render in dev with a
DRAFT mark and are excluded from production pages, search, RSS, sitemap,
and the Atlas. Remove the flag (and for projects, change `status`) to
publish, then commit and deploy.

A section with nothing published is fine, including in the static export:
each detail route is gated on its kind having content (see
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) § 4), so emptying a section from
the studio cannot break the build, and publishing into one restores its
pages automatically.

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

**GitHub Pages is the configured target.** Every push to `main` runs
`.github/workflows/deploy.yml`, which builds a static export and
publishes it to `https://matthewchin7.github.io`. Full setup steps,
including the token the hosted studio needs, are in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Reproduce exactly what CI builds:

```bash
STATIC_EXPORT=1 pnpm build   # → ./out
```

`STATIC_EXPORT=1` also switches the studio's backend to the GitHub API
and drops the dev-only authoring route. Without it, `pnpm build` stays a
regular server build (security headers intact) — that is what
`pnpm start` and the e2e suite use.

The site also still deploys to Vercel with zero config, or any Node host
via `pnpm build && pnpm start`.

Still outstanding before the site is fully "real":

1. Fill the `site.social` URLs in `lib/site/config.ts` (currently empty →
   hidden in the UI).
2. Replace `public/resume.pdf` (placeholder) with the real CV.
3. Optionally configure `site.analytics` (off by default; no tracking
   ships otherwise).

## Documentation

`docs/` holds the design system (visual-direction), IA, content model,
component map, motion spec, accessibility and performance notes, the
originality log, the visual-review log, and the decision record.
`PROGRESS.md` is the build log. `.claude/` contains working rules for
future Claude Code sessions.
