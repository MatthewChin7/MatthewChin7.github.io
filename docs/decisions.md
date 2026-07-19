# Decisions

- **D-001 Design direction.** Synthesis weighted Structured Signal System →
  Research Archive → Editorial Observatory (matrix in visual-direction.md).
  One cinematic plate (hero + ambient atlas); everything else quiet.
- **D-002 TypeScript 5.9, not 7.0.** TS 7 (native) is weeks old; Next
  typegen and typescript-eslint compatibility is unproven. Revisit later.
- **D-003 MDX via next-mdx-remote v6 RSC.** Content lives in `content/`
  (not `app/`), needs frontmatter + dynamic routes; `compileMDX` at build
  keeps zero client MDX runtime.
- **D-004 SVG Atlas, no WebGL/Canvas.** Tens of nodes; SVG gives DOM
  accessibility, crisp 1px lines, trivial hit-testing. Canvas reserved
  only if node count ever exceeds ~300. Three.js explicitly rejected.
- **D-005 Deterministic layout.** Seeded (mulberry32 on node id hash)
  initial positions + fixed-iteration force relaxation computed
  server-side; same content ⇒ same layout every load.
- **D-006 Hand-rolled search.** Corpus is small (tens of documents);
  a tokenized inverted index with prefix matching beats adding
  fuse/minisearch. Index built at compile time, fetched on demand.
- **D-007 Radix only for Dialog.** Menus, tabs, tooltips, disclosure are
  native/ARIA-pattern hand-rolls small enough to own. Dialog focus
  management is the one thing worth outsourcing.
- **D-008 pnpm.** Empty repo; brief prefers pnpm.
- **D-009 Videos seeded as drafts.** No real embed IDs exist; fabricating
  YouTube IDs is forbidden, so seeded videos carry `draft: true` and the
  production index shows a designed empty state.
- **D-010 Contact = mailto + copy-email.** No backend form; no service
  configured. Email from environment (Matthew.Chin@aurevia-md.com);
  social URLs are TODO placeholders in `lib/site/config.ts`.
- **D-011 Theme via inline pre-hydration script** setting `data-theme`,
  `localStorage` persisted, defaulting to `prefers-color-scheme`.
  Avoids flash and a theming dependency.
- **D-012 KaTeX CSS imported globally** on article/project routes only via
  the MDX pipeline layout to keep the homepage light.
- **D-013 Fonts via next/font** (self-hosted, preloaded, `display: swap`
  with size-adjusted fallbacks) — no render-blocking remote CSS.
- **D-014 No analytics by default.** `lib/site/config.ts` has an optional
  analytics slot, off unless configured. No tracking scripts shipped.
