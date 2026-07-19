# Testing rules

- Unit (vitest, tests/unit): content schemas, loaders, related-content
  ranking, search index/scorer, atlas graph + layout determinism. New
  lib code gets unit coverage here.
- E2E (Playwright, tests/e2e): runs against the production build on
  :3311 (`pnpm build` first) so draft exclusion is tested as deployed.
  Projects: desktop Chrome 1440×900 and iPhone 13 (WebKit) — keep both
  green; WebKit differs on focus semantics (see navigation.spec notes).
- Visual regression: baselines in tests/e2e/visual.spec.ts-snapshots.
  Update only for intentional design changes, and eyeball the new PNGs
  before accepting them.
- Never delete or weaken: draft-exclusion tests, axe tests, the
  admin-404-in-prod test, the atlas index-fallback test.
- Content validation (`pnpm validate:content`) runs in prebuild — a red
  build from bad frontmatter is working as intended.
