# Visual direction — “Signal Archive”

## Three directions explored

### A. Editorial Observatory

A cinematic journal: full-bleed typographic plates, oversized serif
statements, an ambient visualization behind the hero, chaptered scrolling.
Strong first impression; risk of style-over-substance and heavy motion.

### B. Structured Signal System

Swiss-modernist instrument panel: strict 12-column grid, monospaced
coordinates everywhere, dense indexes, near-zero decoration, data-first.
Extremely legible and original, but can read cold and depersonalized —
closer to a tooling dashboard than a personal archive.

### C. Research Archive with Marginalia

A working notebook made public: warm paper ground, margin notes, footnote
culture, hand-placed asymmetry, quiet color. Best reading experience and
most personal; weakest ten-second impression on its own.

### Comparison

| Criterion            | A   | B   | C   |
| -------------------- | --- | --- | --- |
| Originality          | ◐   | ●   | ◐   |
| Relevance to Matthew | ◐   | ●   | ●   |
| Reading quality      | ◐   | ◐   | ●   |
| Portfolio clarity    | ●   | ●   | ◐   |
| Mobile viability     | ◐   | ●   | ●   |
| Accessibility        | ◐   | ●   | ●   |
| Performance          | ◐   | ●   | ●   |
| Longevity            | ◐   | ●   | ●   |

### Decision: a synthesis, weighted B → C → A

**Chassis from B** (grid, coordinates, monospaced indexing, restraint),
**warmth and reading culture from C** (paper ground, marginalia, serif
voice, asymmetry), **one cinematic moment from A** (the hero plate with the
ambient Atlas — the only place that earns spectacle). Everything else stays
quiet. This is recorded as D-001 in docs/decisions.md.

## Design principles

1. **The archive is the aesthetic.** Indexing marks — coordinates, rules,
   labels — are the decoration. Nothing ornamental that isn't also
   informational.
2. **Two temperatures.** Warm reading surfaces (paper, serif) against cool
   instrument marks (mono, cobalt). The tension between them is the brand.
3. **Asymmetry with a spine.** A hard left rail alignment; content blocks
   step off the grid deliberately, never randomly.
4. **Restraint until it matters.** One signal color used sparingly, so that
   when cobalt appears it means “live connection.”
5. **Type does the work.** Three voices, big scale contrast, no gradients,
   almost no shadows, very few rounded corners.

## Typography

| Voice     | Face             | Usage                                                        |
| --------- | ---------------- | ------------------------------------------------------------ |
| Display   | Instrument Serif | Statements, article titles, plate numbers. Sizes ≥ 28px only |
| Text / UI | Geist Sans       | Body, navigation, controls, summaries                        |
| Technical | IBM Plex Mono    | Coordinates, dates, tags, labels, metadata, code             |

All loaded via `next/font` (self-hosted at build; no render-blocking
stylesheet). Licenses: Instrument Serif (OFL), Geist (OFL), IBM Plex Mono
(OFL).

Scale (fluid, clamp-based): display-xl ~clamp(2.75rem → 6rem), display
~clamp(2rem → 3.5rem), heading ~1.5rem, body 1rem/1.7, small 0.875rem,
mono-label 0.6875rem uppercase +0.08em tracking.

Article measure: 65–72ch. Baseline spacing unit: 4px; section rhythm in
multiples of 8.

## Color

Tokens in OKLCH, defined in `styles/globals.css` under `:root` (day) and
`[data-theme="night"]`.

### Day — “Reading Room”

- bg `oklch(0.965 0.008 85)` warm bone paper
- fg `oklch(0.24 0.01 270)` graphite
- muted `oklch(0.47 0.015 270)`
- rule `oklch(0.87 0.01 85)` thin warm hairlines
- signal `oklch(0.46 0.19 262)` deep cobalt
- annotation `oklch(0.55 0.19 35)` restrained vermilion
- surface `oklch(0.93 0.01 240)` cool blue-grey panels

### Night — “Night Lab”

- bg `oklch(0.16 0.02 262)` near-black blue
- fg `oklch(0.92 0.015 85)` warm off-white (never pure white on pure black)
- muted `oklch(0.68 0.02 262)`
- rule `oklch(0.32 0.02 262)` steel
- signal `oklch(0.68 0.17 262)` electric cobalt/ultraviolet
- annotation `oklch(0.78 0.14 75)` amber
- surface `oklch(0.21 0.025 262)`

### Domain accents (quiet indexing marks only — 2px ticks, node fills,

small labels; never large surfaces)

markets = cobalt-leaning, mathematics = violet, machine-learning = teal,
physical-systems = vermilion/amber, startups = warm ochre, essays =
graphite. Exact values in globals.css.

Focus ring: 2px solid signal, 2px offset. Selection: signal at low alpha.

## Layout grid

- 12 columns ≥1024px, 6 at ≥640px, 4 below; gutter 24px (16px mobile).
- Max canvas 1600px; article measure 68ch.
- Wide outer margins on large displays (min 6vw).
- The **spine**: a persistent hairline at the left edge of the content
  column on wide screens; section coordinates hang off it.

## Shape family

Thin 1px rules · rectangular media frames with 1px borders · 6px circular
data nodes · one notched corner (a 10px 45° clip) reserved for featured
items · bracket marks `[ ]` around coordinates. Border-radius is 2px or 0
almost everywhere; no card soup.

## Statement callouts

Definitions, theorems, lemmas, corollaries, propositions, examples, remarks,
questions and key ideas render as **rectangular tinted frames**: a 1px border
in the statement's accent at 42% alpha over a 7% (day) / 13% (night) tint of
the same hue, no radius, no shadow. The mono uppercase label carries the accent
colour and always names the kind in words, so colour is never the only signal;
every label clears 4.5:1 against its own tint in both modes.

One hue per kind, from the `--c-*` tokens: theorem and proposition violet,
lemma indigo, corollary teal, definition cobalt, example green, remark grey,
question rust, key idea amber. Key ideas are the one informal box — they carry
a 💡, stay unnumbered, and set upright rather than italic.

## Motifs

1. Coordinates `[02.04]` — plate.item, monospaced, muted.
2. Signal traces — 1px cobalt polylines connecting related items (Atlas and
   list hover states).
3. Margin notes — annotation-colored, hanging in the right rail.
4. Oversized chapter numbers — display serif, 8–12rem, low-contrast.
5. Mono uppercase labels — section names, statuses, metadata.
6. Cropped equations/diagrams — original SVG, never stock.
7. The MC monogram (below).

## MC monogram construction

Drawn on a 32×32 unit grid, stroke width 3 units, `currentColor`, no fill:

- **M**: two verticals at x=4 and x=15, from y=6 to y=26, joined by
  diagonals meeting at (9.5, 18) — a shallow V, like a valley in a price
  path.
- **C**: a three-quarter arc centered (23.5, 16), radius 7.5, opening to
  the right, from 45° to 315°.
- **Node**: a filled 2.5-unit circle at the C's open mouth (28.8, 16) in
  the signal color — the single point of color, reading as a data point
  the C is “measuring.”

The M is structure (grid, verticals), the C is a gauge around a signal
node. Works at 16px (favicon), 24px (header), and large (OG images).
Implemented once as `components/ui/mc-monogram.tsx` and mirrored in
`app/icon.tsx` + OG images.

## Modes

Theme stored in `localStorage("theme")`, applied via `data-theme` on
`<html>` by a pre-hydration inline script (no flash). Default follows
`prefers-color-scheme`. Both modes are first-class; all tokens have day and
night values and contrast is checked in both.
