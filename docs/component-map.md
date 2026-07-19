# Component map

`(s)` = server component, `(c)` = client component ("use client").
Default is server; client only at interaction boundaries.

## Foundation — components/layout, components/motion

- SiteShell (s) — skip link, header, main landmark, footer
- Header (s) → DesktopNav (s), NavActions (c: search trigger, ThemeToggle,
  MobileArchiveMenu trigger)
- MobileArchiveMenu (c, Radix Dialog) — full-screen archive index
- Footer (s) — colophon, links, RSS, build date
- ThemeScript (inline, pre-hydration) + ThemeToggle (c)
- MotionProvider (c, MotionConfig reducedMotion="user") — mounted only in
  client islands that need Motion
- SkipLink (s) · Container (s) · PlateHeader (s: coordinate + label rule)
- SectionCoordinate (s) — `[02]`-style marks

## Typography — components/typography

DisplayHeading · SectionHeading · Body · MonoLabel · Metadata ·
EditorialLink · Caption — all (s), thin wrappers over token classes.

## Content — components/content

- ProjectPreview (s) — homepage/wide layouts, varied compositions
- ProjectIndexRow (s) · NoteIndexRow (s) · MusingEntry (s) ·
  VideoPreview (s)
- Tag (s) · DomainMark (s) · StatusMark (s) · ReadingTime (s)
- RelatedContent (s) · SeriesNavigation (s)
- NotesContents (c) — journal contents w/ preview panel (progressive:
  plain list without JS)

## Media / MDX — components/mdx

Figure · FigureGrid · DiagramFrame · Aside · MarginNote (c: inline
disclosure on mobile) · Definition · Theorem · Proof · Proposition ·
Equation (KaTeX, s) · CodeBlock (s, shiki) + CopyButton (c) · Quote ·
DataTable · Callout · VideoEmbed (c, click-to-load facade) ·
RelatedLink · Bibliography · BeforeAfter · Timeline · Metric · Question ·
UpdateNote · Reflection ("what I believed / what changed / unresolved")

## Interaction — components/ui, components/search, components/navigation

- CommandPalette (c, Radix Dialog, lazy-loaded)
- FilterBar (s — plain links; current filter from searchParams)
- ViewToggle (s, links) · CopyButton (c) · Disclosure (s, native
  details/summary restyled) · Dialog (c, Radix) · Tabs (c, resume modes,
  ARIA tabs pattern) · Tooltip (CSS + aria-describedby, no JS)
- ReadingProgress (c, rAF-throttled, article pages)
- TableOfContents (c: scroll-spy; static list without JS)

## Signature — components/atlas, components/ui

- SignalAtlas (c, dynamic import) — full SVG graph, 4 views
- AmbientAtlas (c, dynamic) — reduced homepage form
- AtlasNodePreview (c) · AtlasControls (c) · AtlasIndex (s — accessible
  list fallback, always rendered)
- SignalTrace (s, decorative connective SVG)
- ThreadIndex (s) · MetadataRail (s) · MCMonogram (s)

## Client-boundary budget

Client components: NavActions, MobileArchiveMenu, ThemeToggle,
CommandPalette (lazy), NotesContents, MarginNote, CopyButton, VideoEmbed,
ReadingProgress, TableOfContents, Tabs, SignalAtlas (lazy), AmbientAtlas
(lazy), AtlasControls/Preview. Everything else stays on the server.
