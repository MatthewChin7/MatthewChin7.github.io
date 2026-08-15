/**
 * KaTeX macro overrides.
 *
 * KaTeX builds negated relations by overlaying U+0338 (combining long solidus)
 * on the base symbol, but it has no metrics for that overlay in the main font,
 * so it silently renders *nothing* and the reader sees a bare `=` where a `≠`
 * belongs. The precomposed characters do have metrics, so mapping the common
 * negations onto `\char` fixes them at the source — every post, and anything
 * written in the studio later, without authors having to know.
 *
 * Keep this list to relations whose precomposed glyph KaTeX can actually
 * measure; see `tests/unit/katex.test.ts`, which fails if one of them starts
 * rendering empty again.
 */
export const katexMacros: Record<string, string> = {
  "\\neq": '\\mathrel{\\char"2260}',
  "\\ne": '\\mathrel{\\char"2260}',
  "\\notin": '\\mathrel{\\char"2209}',
  "\\nleq": '\\mathrel{\\char"2270}',
  "\\nleqslant": '\\mathrel{\\char"2270}',
  "\\ngeq": '\\mathrel{\\char"2271}',
  "\\ngeqslant": '\\mathrel{\\char"2271}',
  "\\nsubseteq": '\\mathrel{\\char"2288}',
  "\\nsupseteq": '\\mathrel{\\char"2289}',
  "\\nmid": '\\mathrel{\\char"2224}',
  "\\nparallel": '\\mathrel{\\char"2226}',
};
