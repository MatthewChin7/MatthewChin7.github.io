import { describe, expect, it } from "vitest";
import {
  bibliographyFor,
  emitBlockHtml,
  blankDocument,
  compileLatex,
  emitMdx,
  emitPreviewHtml,
  formatBibEntry,
  mdxToLatex,
  parseBibtex,
  suggestCiteKey,
  toBibtex,
} from "@/lib/admin/latex";

const BIB = String.raw`@book{williams1991,
  author = {Williams, David},
  title = {Probability with Martingales},
  publisher = {Cambridge University Press},
  year = {1991}
}
@article{unused2020,
  author = {Nobody, A.},
  title = {Never cited},
  year = {2020}
}`;

const DOC = String.raw`\documentclass{article}
\newcommand{\R}{\mathbb{R}}
\title{Stopping Times}
\author{Matthew Chin}
\begin{document}
\maketitle
\begin{abstract}
A note on optional stopping over $\R$.
\end{abstract}

\section{Setup}\label{sec:setup}
Let $X_n$ be a martingale\footnote{Against a filtration.} as in \cite{williams1991}.
Fifty \% and an a--b dash. % trailing comment

\begin{equation}\label{eq:mart}
\mathbb{E}[X_{n+1} \mid \mathcal{F}_n] = X_n
\end{equation}

By \eqref{eq:mart} and section \ref{sec:setup}, done.

\begin{theorem}[Optional stopping]\label{thm:os}
If $T$ is bounded then $\mathbb{E}[X_T] = \mathbb{E}[X_0]$.
\end{theorem}

\begin{proof}
Apply \autoref{thm:os}.
\end{proof}

\begin{itemize}
  \item First
  \item Second
\end{itemize}

\begin{tabular}{ll}
Name & Value \\
$\pi$ & 3.14 \\
\end{tabular}

See \href{https://example.com}{the link}.
\end{document}`;

describe("parseBibtex", () => {
  it("reads keys, types and fields", () => {
    const { entries, diagnostics } = parseBibtex(BIB);
    expect(entries.map((e) => e.key)).toEqual(["williams1991", "unused2020"]);
    expect(entries[0]?.type).toBe("book");
    expect(entries[0]?.fields.publisher).toBe("Cambridge University Press");
    expect(diagnostics).toHaveLength(0);
  });

  it("reports an unclosed entry instead of throwing", () => {
    const { diagnostics } = parseBibtex("@article{broken, title = {No end}");
    expect(diagnostics[0]?.level).toBe("error");
  });

  it("flags duplicate keys", () => {
    const { entries, diagnostics } = parseBibtex(
      "@book{a, title={One}}\n@book{a, title={Two}}",
    );
    expect(entries).toHaveLength(1);
    expect(diagnostics.some((d) => d.message.includes("Duplicate"))).toBe(true);
  });

  it("formats an entry as a reference string and round-trips to BibTeX", () => {
    const entry = parseBibtex(BIB).entries[0]!;
    expect(formatBibEntry(entry)).toBe(
      "Williams, David (1991) Probability with Martingales. Cambridge University Press.",
    );
    expect(toBibtex(entry)).toContain("@book{williams1991,");
  });

  it("suggests a citation key from author, year and title", () => {
    expect(
      suggestCiteKey("Williams, David", "1991", "Probability with Martingales"),
    ).toBe("williams1991probability");
  });
});

describe("compileLatex", () => {
  const doc = compileLatex(DOC, BIB);

  it("extracts the title block and the abstract", () => {
    expect(doc.meta.title).toBe("Stopping Times");
    expect(doc.meta.author).toBe("Matthew Chin");
    expect(doc.meta.abstract).toBeTruthy();
  });

  it("expands preamble macros into the math it emits", () => {
    expect(emitPreviewHtml(doc)).toContain("\\mathbb{R}");
  });

  it("numbers equations and theorems and resolves cross-references", () => {
    const mdx = emitMdx(doc);
    expect(mdx).toContain("\\tag{1}");
    expect(mdx).toContain("By (1) and section [1](#setup)");
    expect(mdx).toContain("Apply Theorem 1.");
  });

  it("maps theorem environments onto the site's MDX components", () => {
    const mdx = emitMdx(doc);
    expect(mdx).toContain('<Theorem n="1" title="Optional stopping">');
    expect(mdx).toContain("<Proof>");
  });

  it("converts citations to numbered anchors and collects the bibliography", () => {
    expect(emitMdx(doc)).toContain("[\\[1\\]](#ref-1)");
    expect(bibliographyFor(doc)).toEqual([
      "Williams, David (1991) Probability with Martingales. Cambridge University Press.",
    ]);
  });

  it("turns footnotes into GFM footnote definitions", () => {
    const mdx = emitMdx(doc);
    expect(mdx).toContain("[^1]");
    expect(mdx).toContain("[^1]: Against a filtration.");
  });

  it("drops the tabular column spec and emits a markdown table", () => {
    const mdx = emitMdx(doc);
    expect(mdx).toContain("| Name | Value |");
    expect(mdx).toContain("| --- | --- |");
    expect(mdx).not.toContain("| ll");
  });

  it("strips comments and unescapes LaTeX literals", () => {
    const mdx = emitMdx(doc);
    expect(mdx).toContain("Fifty % and an a–b dash.");
    expect(mdx).not.toContain("trailing comment");
  });

  it("warns about references that are never cited", () => {
    expect(
      doc.diagnostics.some(
        (d) => d.level === "warning" && d.message.includes("unused2020"),
      ),
    ).toBe(true);
  });

  it("errors on an unknown citation key", () => {
    const bad = compileLatex("\\begin{document}\\cite{ghost}\\end{document}", "");
    expect(
      bad.diagnostics.some((d) => d.level === "error" && d.message.includes("ghost")),
    ).toBe(true);
  });

  it("errors on an unclosed environment and points at the line", () => {
    const bad = compileLatex(
      "\\begin{document}\nline one\n\\begin{theorem}\nunfinished\n\\end{document}",
      "",
    );
    const err = bad.diagnostics.find((d) => d.level === "error");
    expect(err?.message).toContain("never closed");
    expect(err?.line).toBeGreaterThan(0);
  });

  it("errors on a \\ref with no matching \\label", () => {
    const bad = compileLatex("\\begin{document}\\ref{nope}\\end{document}", "");
    expect(bad.diagnostics.some((d) => d.message.includes('"nope"'))).toBe(true);
    expect(emitMdx(bad)).toContain("??");
  });

  it("keeps the text of an unknown command and logs it once", () => {
    const odd = compileLatex(
      "\\begin{document}\\marginpar{aside} and \\marginpar{another}\\end{document}",
      "",
    );
    expect(emitMdx(odd)).toContain("aside");
    expect(odd.diagnostics.filter((d) => d.message.includes("marginpar"))).toHaveLength(
      1,
    );
  });

  it("does not number unlabelled display math", () => {
    const plain = compileLatex("\\begin{document}\n\\[\na = b\n\\]\n\\end{document}", "");
    expect(emitMdx(plain)).not.toContain("\\tag");
  });

  it("counts words, equations, theorems, citations and footnotes", () => {
    expect(doc.stats.equations).toBe(1);
    expect(doc.stats.theorems).toBe(1);
    expect(doc.stats.citations).toBe(1);
    expect(doc.stats.footnotes).toBe(1);
    expect(doc.stats.words).toBeGreaterThan(20);
  });

  it("escapes MDX-hostile characters in body text", () => {
    const braces = compileLatex(
      "\\begin{document}\nA set \\{1, 2\\} and 3 < 4.\n\\end{document}",
      "",
    );
    expect(emitMdx(braces)).toContain("\\{1, 2\\}");
    expect(emitMdx(braces)).toContain("3 \\< 4");
  });

  it("resolves \\input from the file tree and reports a missing file", () => {
    const withInput = compileLatex(
      "\\begin{document}\n\\input{sections/intro}\n\\end{document}",
      "",
      { "sections/intro.tex": "\\section{Intro}\nBody text." },
    );
    expect(emitMdx(withInput)).toContain("## Intro");
    const missing = compileLatex(
      "\\begin{document}\\input{ghost}\\end{document}",
      "",
      {},
    );
    expect(missing.diagnostics.some((d) => d.message.includes("File not found"))).toBe(
      true,
    );
  });
});

describe("emitPreviewHtml", () => {
  const doc = compileLatex(DOC, BIB);

  it("renders the same structure the MDX carries", () => {
    const html = emitPreviewHtml(doc, { renderMath: (tex) => `<span>${tex}</span>` });
    expect(html).toContain('<div class="ovl-titleblock">');
    expect(html).toContain("ovl-abstract");
    expect(html).toContain('<span class="ovl-secnum">1</span>');
    expect(html).toContain("Theorem 1 (Optional stopping).");
    expect(html).toContain('<span class="ovl-eqnum">(1)</span>');
    expect(html).toContain('id="ovl-ref-1"');
  });

  it("escapes HTML in body text", () => {
    const doc2 = compileLatex("\\begin{document}\n3 < 4 \\& 5\n\\end{document}", "");
    const html = emitPreviewHtml(doc2);
    expect(html).toContain("3 &lt; 4 &amp; 5");
  });
});

describe("mdxToLatex", () => {
  it("brings an existing post back into the LaTeX editor", () => {
    const tex = mdxToLatex(
      [
        "## Setup",
        "",
        "Some **bold** and a [link](https://example.com).",
        "",
        "$$",
        "a = b\\tag{1}",
        "$$",
        "",
        "- one",
        "- two",
      ].join("\n"),
    );
    expect(tex).toContain("\\section{Setup}");
    expect(tex).toContain("\\textbf{bold}");
    expect(tex).toContain("\\href{https://example.com}{link}");
    expect(tex).toContain("\\begin{equation}");
    expect(tex).not.toContain("\\tag{1}");
    expect(tex).toContain("\\begin{itemize}");
    expect(tex).toContain("\\item one");
  });

  it("survives a round trip through compileLatex", () => {
    const round = compileLatex(
      `\\begin{document}\n${mdxToLatex("## Title\n\nText with $x^2$ math.")}\n\\end{document}`,
      "",
    );
    expect(emitMdx(round)).toContain("## Title");
    expect(emitMdx(round)).toContain("$x^2$");
  });
});

describe("blankDocument", () => {
  it("is a compilable skeleton with no filler prose", () => {
    const tex = blankDocument({
      title: "New Note",
      author: "Matthew Chin",
      date: "2026-08-10",
    });
    const doc = compileLatex(tex, "");
    expect(doc.meta.title).toBe("New Note");
    expect(doc.diagnostics.some((d) => d.level === "error")).toBe(false);
    // An unfilled \section{} is a placeholder, not content.
    expect(emitMdx(doc).trim()).toBe("");
  });
});

describe("statement boxes", () => {
  const doc = compileLatex(
    [
      "\\begin{document}",
      "\\begin{keyidea}",
      "Implied vol is a quoting convention.",
      "\\end{keyidea}",
      "",
      "\\begin{definition}[Implied volatility]",
      "The $\\sigma$ that matches the market price.",
      "\\end{definition}",
      "",
      "\\begin{corollary}\\label{cor:one}",
      "So the game is fair.",
      "\\end{corollary}",
      "",
      "By \\autoref{cor:one} we are done.",
      "\\end{document}",
    ].join("\n"),
    "",
  );

  it("compiles a key idea to its own MDX component", () => {
    expect(emitMdx(doc)).toContain("<KeyIdea>");
    expect(emitMdx(doc)).toContain("</KeyIdea>");
  });

  it("keeps informal boxes out of the numbered sequence", () => {
    const mdx = emitMdx(doc);
    // The key idea takes no number; definition and corollary share the counter.
    expect(mdx).toContain("<KeyIdea>");
    expect(mdx).toContain('<Definition n="1" title="Implied volatility">');
    expect(mdx).toContain('<Corollary n="2">');
    expect(mdx).toContain("By Corollary 2 we are done.");
  });

  it("gives the preview a per-kind accent class and a key-idea glyph", () => {
    const html = emitPreviewHtml(doc);
    expect(html).toContain("ovl-callout-keyidea");
    expect(html).toContain("ovl-callout-definition");
    expect(html).toContain("ovl-callout-corollary");
    expect(html).toContain("💡");
  });

  it("accepts the short aliases for a key idea", () => {
    const aliased = compileLatex(
      "\\begin{document}\\begin{idea}\nA thought.\n\\end{idea}\\end{document}",
      "",
    );
    expect(emitMdx(aliased)).toContain("<KeyIdea>");
  });
});

describe("source map", () => {
  const source = [
    "\\documentclass{article}",
    "\\begin{document}",
    "\\begin{abstract}",
    "A summary.",
    "\\end{abstract}",
    "",
    "\\section{One}",
    "First paragraph",
    "over two lines.",
    "",
    "\\begin{keyidea}",
    "An idea.",
    "\\end{keyidea}",
    "\\end{document}",
  ].join("\n");
  const doc = compileLatex(source, "");
  const lines = source.split("\n");

  it("addresses the real lines of the file, abstract included", () => {
    expect(doc.sourceMapExact).toBe(true);
    const spans = doc.blocks.map((b) => lines.slice((b.from ?? 1) - 1, b.to).join("\n"));
    expect(spans[0]).toBe("\\section{One}");
    expect(spans[1]).toBe("First paragraph\nover two lines.");
    expect(spans[2]).toBe("\\begin{keyidea}\nAn idea.\n\\end{keyidea}");
  });

  it("reports an inexact map when another file is pulled in", () => {
    const withInput = compileLatex(
      "\\begin{document}\n\\input{part}\n\\end{document}",
      "",
      { "part.tex": "\\section{Part}\nText." },
    );
    expect(withInput.sourceMapExact).toBe(false);
  });

  it("renders one block at a time for the visual editor", () => {
    const block = doc.blocks[0];
    expect(block).toBeTruthy();
    const html = emitBlockHtml(block!, doc);
    expect(html).toContain("One");
    expect(html).not.toContain("An idea.");
  });
});
