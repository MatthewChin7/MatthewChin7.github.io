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
  configured. Email from environment (matthewchin2005@hotmail.com);
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
- **D-015 The admin studio writes through the content schemas.** Every
  write in `/admin` is validated with the same Zod schema
  `pnpm validate:content` uses, and rejected with field-level errors
  rather than written. The studio therefore cannot produce a red build.
  Deletes move items to `content/.trash/` and are restorable until the
  trash is emptied.
- **D-016 LaTeX is an authoring format, not a runtime one.** Math posts
  can be written in an Overleaf-style editor. `lib/admin/latex.ts` parses
  a LaTeX subset into a document AST and emits it twice: MDX (published
  into `content/`) and preview HTML (the studio's output pane), so the
  preview cannot drift structurally from what ships. Sources live in
  `content/latex/<slug>/` and are the thing you re-open and edit;
  the `.mdx` is the compiled artifact. Nothing LaTeX ships to the browser
  on the public site — the published post is ordinary MDX + KaTeX.
- **D-017 Citations come from BibTeX, footnotes from GFM.** A project's
  `references.bib` is parsed in the studio; only entries actually cited
  with `\cite{}` are written to the post's `bibliography` frontmatter, so
  the rendered References list always matches the text. `\footnote{}`
  compiles to GFM footnotes, which the existing remark pipeline renders.
- **D-018 No analytics theatre in the studio.** The dashboard shows only
  numbers derived from the content tree (counts, drafts, word counts).
  There is no mock traffic, subscriber, or campaign data — with no
  analytics provider configured (D-014), inventing figures would be
  worse than showing none.
- **D-019 Statement callouts are tinted frames, not cards.** One accent hue
  per statement kind (`--c-*` tokens, both modes), a 1px frame over a tint
  of the same hue, no radius or shadow — the shape family holds. The kind is
  always spelled out in the label, so the colour carries no information on
  its own. Key ideas are deliberately informal: 💡, unnumbered, upright.
- **D-020 The visual editor is block-level, not character-level.** A true
  WYSIWYG LaTeX editor needs a caret model over rendered glyphs; instead the
  parser records the source line range each block came from
  (`Block.from`/`to`), the studio renders the compiled document, and clicking
  a block swaps it for exactly the lines that produced it. Edits are written
  back by splicing those lines, so the `.tex` stays canonical and nothing is
  round-tripped through a lossy model. `\input` and multi-line macros move
  lines, so `compileLatex` reports `sourceMapExact: false` and the visual
  editor goes read-only rather than writing through a map it cannot trust.
- **D-021 MDX drops JSX expression attributes.** `n={1}` never reaches the
  component through `next-mdx-remote`'s pipeline; `n="1"` does. Every numbered
  component prop (callout numbers, `MarginNote index`) is therefore a string.
- **D-022 The studio's storage is injected, so it runs in two places.**
  All of its logic — schema validation, slug uniqueness, trash, LaTeX
  projects, media — lives in `lib/admin/store-core.ts` over a small
  synchronous `Vfs` interface. `pnpm dev` binds it to the working tree
  (`node-vfs.ts`); the deployed static site binds it to an in-memory
  snapshot of the repo (`vfs.ts`), and turns the mutations that snapshot
  records into one commit through the GitHub API. Because both share the
  code, the hosted studio cannot validate differently from the local one,
  and neither can produce a red build. `lib/admin/latex.ts` already had no
  imports at all, so the LaTeX compiler runs unchanged in the browser.
- **D-023 The hosted studio authenticates with the author's own token,
  not an OAuth service.** GitHub Pages cannot host an OAuth relay, and the
  alternative (Decap CMS) needs one plus a Cloudflare Worker. Instead the
  studio asks for a fine-grained PAT scoped to this repository, kept in
  `localStorage` and sent only to `api.github.com`. Nothing secret is
  built into the site, so the page is safe to publish: without a token it
  is an inert form. The cost is a token to manage and revoke, which is a
  smaller surface than a relay to operate.
- **D-024 Routes that cannot be exported are excluded by config, not by
  deleting files in CI.** `next.config.ts` drives `pageExtensions`, so the
  dev-only authoring API (`route.dev.ts`) and every content detail route
  (`page.<kind>.tsx`) are simply not routes in a static build unless they
  have something to render. `output: export` rejects a dynamic route that
  prerenders zero pages, and drafts never prerender — so without this,
  emptying a section from the hosted studio would turn the deploy red.
  A local `STATIC_EXPORT=1 pnpm build` produces exactly what the workflow
  publishes, and a route returns on its own the moment content justifies it.
- **D-025 Open Graph cards are site-wide, not per post.** Per-item cards
  have to live inside the dynamic segment they describe, where D-024's
  gate cannot reach them: Next resolves metadata files (`opengraph-image`)
  by its own convention and ignores custom page extensions, so an empty
  section would break the export. One card at the site root, inherited by
  every page, costs a little sharing polish and removes a whole class of
  build failure.
- **D-026 The hosted studio batches edits into one commit.** Every commit
  triggers a rebuild and a redeploy, so committing per save made deleting
  five posts cost five deploys. Writes now accumulate in the tab's working
  copy and go up together when the author presses Publish. The cost is that
  unpublished work lives only in that tab, so the studio states it in the
  admin bar, warns on tab close, and warns again on disconnect.
- **D-027 Deleting an item takes its inbound links with it.** A `related`
  id pointing at something that no longer exists fails
  `pnpm validate:content`, and therefore the build — which, from the hosted
  studio, means a red deploy minutes after an apparently successful delete.
  `deleteItem` now strips the deleted id from every item that referenced it
  and records those items on the trash entry, so restoring returns the post
  to the graph rather than to an island.
- **D-028 Tests assert behaviour, not the current contents of the archive.**
  Unit and e2e tests used to name specific posts, so retiring one turned the
  suite red for no real reason. They now find their subject through the
  section index and skip when a section is empty. Content-shaped assertions
  (counts, particular slugs) were replaced with invariants: every item gets
  derived fields, every declared relation becomes a weight-3 edge, every
  plotted Atlas node appears in the accessible index.
