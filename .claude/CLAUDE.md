# The Signal Archive — working notes for Claude Code

Personal website for Matthew Chin. Next.js 16 App Router, React 19,
TS strict, Tailwind 4, MDX via next-mdx-remote/rsc, Zod-validated content
in `content/`. Design system: "Signal Archive" (docs/visual-direction.md).

## Commands

- `pnpm dev` · `pnpm build` (runs content validation first) · `pnpm start`
- `pnpm typecheck` · `pnpm lint` · `pnpm test` (vitest) · `pnpm test:e2e`
  (Playwright; needs a prior `pnpm build`, serves on :3311)
- `pnpm new:note|new:project|new:musing` — content scaffolds

## Hard rules

- Read `.claude/rules/*.md` before design, content, or test changes.
- Never fabricate facts about Matthew: no invented metrics, employers,
  awards, results, or dates. Placeholders are explicit `TODO(matthew)`.
- Drafts (`draft: true`) must stay out of production surfaces; the e2e
  suite asserts this — keep those tests passing.
- Server components by default; new "use client" boundaries need a reason.
- All content facts live in `content/` or `lib/site/config.ts` — never
  hardcode biography, emails, or URLs in components.
- After UI changes: `pnpm build && pnpm exec playwright test`; refresh
  visual baselines only when the change is intentional.
