# Visual review log

Screenshots were captured against the production build at 390 / 768 /
1024 / 1440 / 1728 widths (plus night mode) and inspected. Playwright
visual-regression baselines live in `tests/e2e/visual.spec.ts-snapshots/`.

## Screens inspected

- Homepage: 390, 768, 1440, 1728, full-page 1440, night 1440
- Work index: 1024, 1440 · Project case study: 1440
- Notes index: 1440 · Article (math + margin notes): 390, 1440
- Atlas: 1440 · Résumé: 1440 · Mobile menu: 390

## Problems found → changes made

1. **Duplicate coordinate.** `[00 / INDEX]` appeared in both the header
   and the hero rail → removed from the hero; the header owns nav state.
2. **Mobile hero dead space.** `min-h-[82svh]` with the ambient atlas
   hidden left a large blank block on 390px → min-height now applies at
   `md:` only; the metadata rail hugs the CTA on mobile.
3. **Ambient atlas under text.** Nodes drifted beneath the supporting
   paragraph → a CSS `mask-image` fades the atlas out across the text
   column.
4. **Monogram read as "MG".** The signal node at the C's mouth closed the
   letterform at small sizes → node moved to the M's valley vertex (a
   marked data point on the price path); C is now clean. Updated in the
   component, favicon, and OG template; construction doc amended.
5. **Margin notes overlapped body text** on lg screens (absolute
   positioning from an inline anchor) → rebuilt as a Tufte-style
   `float-right` + negative-margin sidenote, xl+ only; below xl the
   accessible inline disclosure is used.
6. **Atlas label collisions** in dense clusters → persistent labels
   restricted to projects (weight ≥ 3), cluster repulsion increased, and
   label placement alternates above/below by node index.
7. **Contrast failures** (axe): the `--faint` token was too light in both
   modes for small mono text, and thread ghost numerals sat below 3:1 →
   tokens darkened (day L 0.62→0.51, night 0.56→0.67); numerals use
   `--faint`.
8. **Homepage `<dl>` invalid structure** (plate 06 held a non-dt/dd
   child) → links moved outside the list.

## Remaining concerns (recorded honestly)

- The Markets cluster in the Atlas is visually denser than the others;
  with more content the domain view will need per-cluster canvas sizing.
- Article margin notes only hang in the margin at xl (≥1280px); between
  lg and xl the disclosure variant is used. Acceptable, by design.
- Night-mode SVG cover visuals reuse day-calibrated opacities; reviewed
  and legible, but worth revisiting when real figures land.
- The résumé placeholder rows announce themselves visibly; this is
  intentional until Matthew supplies verified details.
