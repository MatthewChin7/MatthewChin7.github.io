# PROGRESS — The Signal Archive

Personal website for Matthew Chin. Build log and state of work.

## Current phase

Phase 9 — final verification (all build phases complete)

## Phases

- [x] Phase 0 — Repository audit (empty repo; findings below)
- [x] Phase 1 — Design and architecture docs (7 docs in docs/)
- [x] Phase 2 — Foundation (tokens, fonts, shell, nav, theme, grid)
- [x] Phase 3 — Content engine (Zod schemas, MDX pipeline, search index,
      related-content, RSS, sitemap, robots, OG images, validation script)
- [x] Phase 4 — Homepage (plates 00–07, ambient atlas, original SVG covers)
- [x] Phase 5 — Content routes (work, notes, marginalia, videos, resume,
      about, now, contact, search, 404, error) + /admin dev studio
- [x] Phase 6 — Signal Atlas (4 views, keyboard nav, URL state, index
      fallback, deterministic layout)
- [x] Phase 7 — Polish (screenshot review at 390/768/1024/1440/1728 +
      night; 8 defects found and fixed — docs/visual-review.md)
- [x] Phase 8 — Adversarial review (a11y/axe, security greps, headers,
      feed validity, console errors, admin smoke test — notes below)
- [x] Phase 9 — Final verification (results in final report)

## Phase 0 findings

- Repository was empty except `.git` (branch `main`, no commits).
- Environment: Node 25.9, pnpm 11.15 (installed via npm; corepack absent).
- Disk was 99% full; freed by clearing npm/pnpm caches (regenerable).

## Decisions

Full log in docs/decisions.md (D-001…D-014). Highlights: synthesis design
direction weighted Structured-Signal → Research-Archive → Observatory;
TS 5.9 over 7.0; next-mdx-remote v6 RSC; SVG atlas with seeded
deterministic layout; hand-rolled search; Radix for dialogs only; JSON
data files for marginalia/videos so /admin can append; dev-only /admin
(prod 404s, no auth surface).

## Assumptions

- Email matthewchin2005@hotmail.com (from environment) used for contact.
- `site.url` is `https://example.com` until the real domain is chosen.
- Social URLs empty (hidden in UI) until supplied.
- Résumé dates/employers beyond the brief are `TODO(matthew)` placeholders.
- Seed marginalia are marked "Sample entry."; seed videos are drafts with
  TODO embed ids (excluded from production by tests).

## Phase 8 review notes

- axe (13 routes, WCAG 2.2 AA tags): 0 serious/critical after fixes.
- All `target="_blank"` anchors carry `rel="noopener noreferrer"` (verified
  by script). `dangerouslySetInnerHTML` only for the pre-hydration theme
  script and JSON-LD (controlled, serialized server-side).
- Security headers served; RSS + sitemap pass xmllint; robots disallows
  /admin; no console errors across 6 key routes.
- /admin smoke-tested in dev (creates draft, rejects bad upload); e2e
  asserts 404 in production.

## Known issues / limitations

- Lighthouse not yet run against a deployed URL (local runs measure the
  dev machine); expected ≥95 per docs/performance.md reasoning.
- Index pages that read searchParams render dynamically (fast, but not
  fully static). Fine on Vercel/Node hosts.
- Atlas domain view will need per-cluster sizing if content grows a lot.
- public/resume.pdf is a placeholder PDF.

## Next actions (for Matthew)

1. Set real domain in lib/site/config.ts; fill social URLs.
2. Replace public/resume.pdf and the TODO(matthew) résumé rows.
3. Replace sample marginalia; publish draft notes as they're finished.
4. Supply a photograph for the About page slot (optional).
5. Record videos / add real embed IDs, then un-draft them.

## Verification status

See the final verification report in the conversation summary; last full
run: format:check ✓, lint ✓, typecheck ✓, vitest 31/31 ✓, content
validation ✓, production build ✓ (45 static pages), Playwright 68 passed /
24 intentionally skipped ✓ (flows + axe + visual regression, desktop
Chrome + iPhone 13 WebKit), production smoke on :3311 ✓.
