# Motion system

## Principles

1. Motion explains relationships (what opened what, what relates to what);
   it never performs for its own sake.
2. Text is readable immediately — no content waits behind an entrance.
3. Navigation is never delayed for spectacle.
4. Every effect is interruptible; every hover affordance has a
   focus-visible equivalent.
5. No essential information is conveyed only through animation.

## Timing tokens (CSS custom properties)

| Token         | Value                             | Use                                |
| ------------- | --------------------------------- | ---------------------------------- |
| `--t-micro`   | 140ms ease-out                    | hovers, focus, toggles, underlines |
| `--t-comp`    | 220ms ease-out                    | disclosure, palette open, previews |
| `--t-section` | 420ms cubic-bezier(0.22,1,0.36,1) | dialogs, atlas view changes        |
| ambient       | ≥ 20s linear                      | Atlas drift only, pausable         |

## Implementation tiers

- **CSS transitions** — default for all simple state (hover, focus, theme,
  disclosure). Most of the site's motion lives here.
- **Motion for React** — only where orchestration is needed: command
  palette open/close, mobile archive menu, Atlas view-to-view position
  interpolation. Imported via the lightweight `motion/react` entry, loaded
  inside already-client components.
- **requestAnimationFrame** — the ambient homepage Atlas drift only.
  Paused on `document.visibilitychange`, on `IntersectionObserver` exit,
  and under reduced motion. Pointer parallax clamped to ±3px.

## Entrances

A single shared pattern: `fade-rise` (opacity 0→1, translateY 8px→0,
220ms) applied via CSS to at most the first screenful, with stagger capped
at 3 items × 60ms. Below-fold sections do not animate on scroll — no
scroll-linked animation anywhere.

## Forbidden (per brief, enforced in review)

Spring overshoot beyond 1.02 · rubber-banding · stagger chains > 3 ·
blur transitions · text scaling from < 0.95 · transforming reading
surfaces during scroll · smooth-scroll libraries · scroll hijacking ·
marquees · custom cursors.

## Reduced motion

`prefers-reduced-motion: reduce` → a global CSS block zeroes transition
and animation durations for transform/opacity effects (state changes
become immediate), the ambient Atlas renders as a static frame, parallax
is disabled, and Motion components receive `reducedMotion: "always"` via
MotionConfig. Meaning and state are always preserved.
