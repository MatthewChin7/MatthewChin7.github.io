# Content rules

- Truth first: no invented results, metrics, credentials, employers,
  dates, or testimonials. Unverified facts are `TODO(matthew)`
  placeholders or conservative language ("in preparation").
- All content passes `scripts/validate-content.ts` — new fields go into
  `lib/content/schemas.ts` first, with a vitest case.
- Slugs are kebab-case and globally unique across content types.
- `related` uses global ids (`work/slug`, `notes/slug`, …); explicit
  relations outrank inferred tag matches — prefer adding them.
- Drafts: `draft: true` (projects also `status: "draft"`). Published
  content may reference drafts, but links to them are hidden in prod.
- Marginalia bodies ≤ 500 words. Sample entries are marked
  "Sample entry." — replace them with real ones over time.
- Voice: precise, curious, first person, concrete nouns; no "passionate",
  no "innovative", no "journey", no corporate filler.
