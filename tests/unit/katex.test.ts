import { describe, expect, it } from "vitest";
import katex from "katex";
import { katexMacros } from "@/lib/content/katex-macros";

/**
 * KaTeX composes negated relations by overlaying a combining solidus, and it
 * has no metrics for that overlay — so it renders *nothing* and a `≠` silently
 * becomes a bare `=`. That is the worst kind of bug in a maths post: the
 * statement still reads as a sentence, but it now claims the opposite.
 *
 * These tests fail if the overrides in lib/content/katex-macros stop producing
 * a real glyph, or if a negation is added without one.
 */
function renderedText(expr: string): string {
  const html = katex.renderToString(expr, {
    throwOnError: false,
    output: "html",
    macros: katexMacros,
  });
  return html.replace(/<[^>]*>/g, "");
}

describe("katex negated relations", () => {
  it("renders ≠ as a glyph, not as a bare equals", () => {
    expect(renderedText("a \\neq b")).toBe("a≠b");
    expect(renderedText("a \\ne b")).toBe("a≠b");
  });

  it("documents the bug being worked around", () => {
    // Without the override KaTeX emits the base "=" preceded by U+E020, a
    // private-use placeholder for the strike-through overlay. No font maps it,
    // so it renders as nothing or as a stray mark next to the equals, and the
    // precomposed ≠ never appears at all.
    const bare = katex
      .renderToString("a \\neq b", { throwOnError: false, output: "html" })
      .replace(/<[^>]*>/g, "");
    expect(bare).not.toContain("\u2260");
    expect(bare).toBe("a\uE020=b");
  });

  it("gives every overridden macro a visible character", () => {
    for (const name of Object.keys(katexMacros)) {
      const text = renderedText(`a ${name} b`);
      expect(text, `${name} rendered as ${JSON.stringify(text)}`).toMatch(/^a\S+b$/);
    }
  });
});
