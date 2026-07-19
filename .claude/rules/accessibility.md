# Accessibility rules

- WCAG 2.2 AA floor. The axe e2e tests (tests/e2e/a11y.spec.ts) must
  stay green — never skip or loosen them to land a change.
- Every interactive control: keyboard operable, visible focus (signal
  ring), accessible name. Icon-only buttons need aria-label.
- No hover-only content: every hover affordance needs a focus and a
  touch equivalent (see MarginNote, NotesContents for patterns).
- Filters remain plain links so they work without JS.
- Dialogs use Radix; if a dialog is mounted lazily, wire explicit focus
  restore (see MobileArchiveMenu.onCloseAutoFocus).
- The Atlas graph is supplementary: AtlasIndex must always render the
  complete graph as a list, and mobile keeps the index primary.
- New media: alt text for meaningful images, empty alt for decorative,
  transcripts for video, no autoplay.
