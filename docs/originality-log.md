# Originality log

## 1. Design principles

See docs/visual-direction.md. In short: the archive's own indexing
apparatus (coordinates, rules, monospaced labels, signal traces) is the
entire decorative vocabulary; warm editorial reading surfaces sit inside a
cool instrument grid; one signal color is rationed so it always means
"connection."

## 2. Original visual grammar

- Plate-numbered homepage (`[00]`–`[07]`) treated as pages of a bound
  research atlas, not "sections of a landing page."
- The spine: a persistent left hairline that coordinates hang from.
- Bracketed coordinates `[02.04]` as the recurring index mark.
- Signal traces: 1px polylines that literally connect related entries.
- Notched corner (single 45° clip) as the only "featured" ornament.
- A constructed MC monogram (M as grid verticals + valley, C as a gauge
  arc around a single cobalt data node) — documented construction in
  visual-direction.md, drawn from scratch as inline SVG.
- All project visuals are original inline SVGs derived from each project's
  actual mathematics (vol smile from an SVI-shaped curve, advection field
  from a synthetic vector grid, tensor-basis notation, order-book ladder,
  locale dependency map) — abstract but semantically honest; no fake data
  presented as results, no stock imagery.

## 3. Signature interactions derive from the content

The Signal Atlas is a direct rendering of the site's real content graph
(nodes = actual projects/notes/marginalia/videos/topics; edges = actual
frontmatter relationships). Its four views (domain / method / time /
connections) mirror how Matthew's work actually organizes: by field, by
technique, by chronology, by citation. Nothing in it is decorative
particle noise; deleting a content file changes the visualization.

## 4. Clichés explicitly avoided

Purple-gradient-on-black hero · bento-card grids · glassmorphism · neon
cyberpunk · fake terminals/Bloomberg/code editors · floating tech logos ·
skill bars and percentages · giant circular avatar · rotating text ·
marquees · scroll hijacking · loading screens · cursor replacement ·
gratuitous Three.js · uniform fade-up-on-scroll for every section ·
rounded-card soup · testimonials · fabricated metrics · "passionate
developer" copy.

## 5. Third-party primitives and their transformation

- **Radix Dialog** (behavior only: focus trap, esc, restore, portal) —
  used for the mobile archive menu, command palette, and dialogs. All
  visuals (full-bleed archive index sheet, hairline-ruled palette) are
  written from scratch; nothing resembles Radix examples.
- **Motion for React** — used as a tween/orchestration engine only; no
  preset animations exist in the library to copy.
- **rehype-pretty-code / Shiki** — token colorizer; the code-block chrome,
  colors, and frame are custom to the token system.
- **KaTeX** — math layout engine; typography around it is ours.
- **Tailwind** — compiler for our own token system; no Tailwind UI or
  component library markup is used.

## 6. External assets and licenses

| Asset            | Source              | License |
| ---------------- | ------------------- | ------- |
| Instrument Serif | Google Fonts        | OFL 1.1 |
| Geist Sans       | Vercel/Google Fonts | OFL 1.1 |
| IBM Plex Mono    | IBM/Google Fonts    | OFL 1.1 |
| KaTeX fonts/CSS  | KaTeX (npm)         | MIT     |

No stock imagery, no icon packs (icons are hand-drawn inline SVG), no
photographs (a labeled placeholder slot awaits Matthew's photo), no
copied compositions. No reference site was searched for or imitated
during design; the direction was derived from the brief's content
inventory and the comparison matrix in visual-direction.md.
