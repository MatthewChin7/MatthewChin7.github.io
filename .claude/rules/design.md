# Design rules

- Tokens only — every color through the CSS custom properties in
  `styles/globals.css`; both modes must be updated together and pass
  contrast (small text 4.5:1, large 3:1) in each.
- Shape family: 1px rules, rectangular frames, 6px nodes, brackets, one
  notched corner for featured items. No new rounded-card patterns, no
  shadows beyond the palette/preview panels, no gradients.
- Statement callouts (definition/theorem/…/key idea) use the `--c-*` accent
  tokens: 1px frame + same-hue tint, no radius, label names the kind in
  words. See docs/visual-direction.md § Statement callouts before adding a
  kind — a new kind needs both modes and a 4.5:1 label.
- Three type voices only: Instrument Serif (display ≥28px), Geist Sans
  (text/UI), IBM Plex Mono (labels/meta/code). Mono labels are 11px
  uppercase +0.08em.
- Anti-patterns are enumerated in docs/originality-log.md §4 — do not
  reintroduce any of them (marquees, skill bars, glassmorphism, fake
  terminals, cursor effects, scroll hijacking…).
- Motion: obey docs/motion-system.md timing tokens; no scroll-linked
  animation; everything must respect prefers-reduced-motion.
- The Atlas must stay a true rendering of the content graph — nothing
  decorative that isn't data.
