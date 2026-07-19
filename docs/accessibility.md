# Accessibility notes

Target: WCAG 2.2 AA. Verified by automated axe scans (13 routes, tags
wcag2a/aa, wcag21a/aa, wcag22aa — zero serious/critical violations),
keyboard-flow e2e tests, and manual DOM inspection.

## Structure

- Landmarks: `header`, `nav` (labeled: Primary, Footer, Filters, Archive
  index, Table of contents), `main#main`, `footer`, labeled `aside`s.
- One `h1` per page; heading order is linear; decorative marks are
  `aria-hidden` with `sr-only` equivalents where meaning exists.
- Skip link is the first focusable element and targets `#main`.

## Keyboard

- Full traversal of nav, filters, palette, menu, and atlas without a
  pointer. Filters are plain links (server-rendered), so they work with
  no JS at all.
- Command palette: ⌘/Ctrl-K toggles, `/` opens only when focus is not in
  an input, arrows + Enter operate the listbox (combobox pattern with
  `aria-activedescendant`), Esc closes.
- Mobile archive menu: Radix Dialog (trap, Esc); focus restore to the
  trigger is explicit (`onCloseAutoFocus`) because WebKit does not focus
  buttons on tap.
- Signal Atlas: `role="application"` SVG; nodes are `role="link"` with
  full labels; arrow keys walk to the nearest node in the pressed
  direction; Enter/Space opens; Esc clears selection and filter. The
  Atlas is never the only path — `AtlasIndex` renders the entire graph
  as a grouped list on every /atlas load, and mobile gets the index as
  the primary representation.

## Vision

- All color tokens checked in both modes; `--faint` darkened after axe
  flagged it (see visual-review.md). Focus ring is 2px signal with
  offset, never suppressed, and sticky-header `scroll-padding-top`
  keeps focused targets visible.
- No meaning is conveyed by color alone: domain dots pair with labels or
  sr-only text; statuses are words; draft state is the word "Draft".
- Night mode avoids pure white on pure black.

## Motion & media

- `prefers-reduced-motion`: global CSS zeroes transitions/animations;
  the ambient atlas renders a static frame (verified by e2e); Motion
  components run under `MotionConfig reducedMotion="user"`.
- No autoplay anywhere. Video embeds are click-to-load facades with the
  provider named on the button; transcripts and chapters are HTML.
- Margin notes, abstracts, and previews all have non-hover equivalents
  (inline disclosures, always-rendered mobile text, focus triggers).

## Known limitations

- The atlas graph's arrow-key navigation is a custom pattern; it is
  documented in the on-page hint and the index remains the canonical
  surface for AT users.
- axe cannot judge the _quality_ of alt/label text; that was reviewed by
  hand and should be re-reviewed when real images arrive.
