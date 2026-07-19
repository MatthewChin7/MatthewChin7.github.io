# Information architecture

## Routes

| Route                | Purpose                                              | Rendering       |
| -------------------- | ---------------------------------------------------- | --------------- |
| `/`                  | Homepage — editorial plates 00–07                    | static          |
| `/atlas`             | Full Signal Atlas + accessible index fallback        | static + client |
| `/work`              | Project archive, filterable (URL state)              | static          |
| `/work/[slug]`       | Project case study (MDX)                             | static (SSG)    |
| `/notes`             | Essays / research notes / explainers / reviews index | static          |
| `/notes/[slug]`      | Article page (MDX)                                   | static (SSG)    |
| `/marginalia`        | Chronological short-form stream, filterable          | static          |
| `/marginalia/[slug]` | Permalink for one marginalia entry                   | static (SSG)    |
| `/videos`            | Contact-sheet video archive                          | static          |
| `/videos/[slug]`     | Video page (facade player, chapters, transcript)     | static (SSG)    |
| `/resume`            | Semantic HTML résumé, concise/detailed, print CSS    | static          |
| `/about`             | Biography, trajectory, principles                    | static          |
| `/now`               | Now page (MDX, last-updated)                         | static          |
| `/contact`           | Email + links, copy-email interaction                | static          |
| `/search`            | Full archive search (client, prebuilt index)         | static + client |
| `/feed.xml`          | RSS 2.0 (notes + marginalia + projects)              | route handler   |
| `/sitemap.xml`       | via `app/sitemap.ts`                                 | generated       |
| `/robots.txt`        | via `app/robots.ts`                                  | generated       |
| not-found / error    | Custom 404 + global error boundary                   | —               |

Per-route OG images: default `app/opengraph-image.tsx`, dynamic for
`/notes/[slug]` and `/work/[slug]`.

## Navigation

Primary (desktop header): INDEX · WORK · NOTES · ATLAS · ABOUT
Secondary (footer + mobile archive menu + command palette): MARGINALIA ·
VIDEOS · CV · NOW · CONTACT · SEARCH · RSS

Header right: search trigger (⌘K), theme toggle, current section
coordinate (e.g. `[03 / NOTES]`).

Mobile: “INDEX” button opens a full-screen archive menu (Radix Dialog:
focus trap, Esc, focus restore) listing all destinations with coordinates,
contact links, and theme control.

Command palette (⌘K / Ctrl-K, `/` when not in an input, search button):
searches projects, notes, marginalia, videos, topics, and navigation
destinations; rows show type, title, date, tags.

## Section coordinates

Every top-level destination has a stable two-digit coordinate used in
navigation, plate numbers, and URLs' visual labels:

00 INDEX · 01 WORK · 02 NOTES · 03 MARGINALIA · 04 VIDEOS · 05 ATLAS ·
06 CV · 07 ABOUT · 08 NOW · 09 CONTACT

## URL state

- `/work?domain=markets&status=ongoing&view=index&year=2025`
- `/atlas?view=domain&domain=markets&node=btc-vol-surface`
- `/marginalia?type=question`
- `/search?q=volatility`

All filters work as plain links (no pointer required); JS enhances.

## Content → route mapping

`content/projects/*.mdx` → /work/[slug] · `content/notes/*.mdx` →
/notes/[slug] · `content/marginalia/*.ts` (data) → /marginalia/[slug] ·
`content/videos/*.ts` (data) → /videos/[slug] · `content/pages/*.mdx` →
about/now sections · `content/resume/resume.ts` → /resume.

Drafts (`draft: true`) are excluded from production builds, feeds,
sitemaps, search, and the Atlas; visible in dev with a DRAFT mark.
