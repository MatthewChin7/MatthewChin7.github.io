# Performance notes

## Architecture choices that carry the budget

- **Server components by default.** Client boundaries exist only at:
  NavActions (+ lazily mounted CommandPalette / MobileArchiveMenu),
  ThemeToggle, NotesContents, MarginNote, CopyButton, PrintButton,
  VideoEmbed, ReadingProgress, TableOfContents, SearchPageClient,
  AmbientAtlas (dynamic), SignalAtlas (atlas route only), AdminStudio
  (dev only). Everything else ships zero JS.
- **Lazy interaction surfaces.** The command palette and mobile menu are
  `next/dynamic` chunks that mount on first intent (keyboard shortcut or
  tap), not on load. The search index (~30 docs) is fetched only when the
  palette or /search actually opens.
- **Fonts** are self-hosted via `next/font` with `display: swap` and
  size-adjusted fallbacks — no render-blocking CSS, no font CLS.
- **Motion for React** is imported only inside the atlas route's client
  chunk. No smooth-scroll library, no Three.js, no global state library.
- **KaTeX CSS** is imported only by MDX-rendering routes, not globally.
- **Ambient atlas** is a 14-node SVG; its rAF loop pauses on
  `visibilitychange` and IntersectionObserver exit, clamps pointer
  response to ±3px, and doesn't start at all under reduced motion.
- **Media discipline:** all visuals are inline SVG (no hero images to
  optimize or shift); the video player is a facade so no third-party
  script loads pre-consent.
- **Static output:** every content page is SSG; only routes reading
  `searchParams` (work/notes/marginalia/resume/atlas indexes) render
  dynamically, each from in-memory content caches.

## Measured

`next build` first-load JS (production, Next 16.2 / Turbopack):

- Shared baseline ~131 kB gzip (React 19 + Next runtime + shell)
- Homepage +6 kB route chunk; article pages +3–8 kB (KaTeX CSS aside)
- Atlas route +~60 kB (Motion + graph component) — isolated to /atlas

Web-vitals reasoning: LCP element is server-rendered text (hero
statement) with self-hosted fonts → no network waterfall; CLS sources
(fonts, media) are neutralized by size-adjust and fixed aspect boxes;
INP paths (palette, filters, theme) do trivial work. Lighthouse ≥ 95 is
expected but should be confirmed on the deployed URL — recorded as a
follow-up because a local Lighthouse run on this machine measures the
dev hardware, not the CDN.

## Rules for future work

1. New interactive components must justify their client boundary in PR
   description; prefer server + links.
2. Anything above ~20 kB gzip gets a decisions.md entry.
3. The Atlas stays SVG until node count approaches ~300 (D-004).
4. No scroll-linked animation that triggers layout; transform/opacity
   only.
