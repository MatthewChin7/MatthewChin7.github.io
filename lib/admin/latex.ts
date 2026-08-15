/**
 * LaTeX authoring engine for the admin studio.
 *
 * A LaTeX source document is parsed once into a small document AST and then
 * emitted twice: as MDX (what gets written into `content/` and published) and
 * as preview HTML (what the Overleaf-style output pane shows). Both emitters
 * walk the same tree, so the preview can never drift structurally from what
 * the site will publish.
 *
 * Pure — no filesystem, no React. Everything here is unit-tested in
 * tests/unit/admin-latex.test.ts.
 */

/* ————————————————————————————————————————————————————————————————
   Diagnostics — the compile log
   ———————————————————————————————————————————————————————————————— */

export type DiagnosticLevel = "error" | "warning" | "info";

export interface Diagnostic {
  level: DiagnosticLevel;
  /** 1-based line in the main file; 0 when not attributable. */
  line: number;
  message: string;
}

/* ————————————————————————————————————————————————————————————————
   BibTeX
   ———————————————————————————————————————————————————————————————— */

export interface BibEntry {
  key: string;
  /** article, book, inproceedings, misc, … */
  type: string;
  fields: Record<string, string>;
}

/** Read a balanced {…} group starting at `i` (which must point at "{"). */
function readGroup(src: string, i: number): { value: string; end: number } | null {
  if (src[i] !== "{") return null;
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === "\\") {
      j++;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return { value: src.slice(i + 1, j), end: j + 1 };
    }
  }
  return null;
}

/** Read an optional [..] argument starting at `i`. */
function readOptional(src: string, i: number): { value: string; end: number } | null {
  if (src[i] !== "[") return null;
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === "\\") {
      j++;
      continue;
    }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return { value: src.slice(i + 1, j), end: j + 1 };
    }
  }
  return null;
}

const LATEX_ACCENTS: Record<string, string> = {
  "\\&": "&",
  "\\%": "%",
  "\\_": "_",
  "\\#": "#",
  "\\$": "$",
  "~": " ",
  "---": "—",
  "--": "–",
  "``": "“",
  "''": "”",
};

/** Strip BibTeX braces/commands from a field value for display. */
function cleanBibValue(v: string): string {
  let s = v.replace(/\s+/g, " ").trim();
  s = s.replace(/\\(?:emph|textit|textbf|mbox|text)\{([^{}]*)\}/g, "$1");
  s = s.replace(/[{}]/g, "");
  for (const [from, to] of Object.entries(LATEX_ACCENTS)) s = s.split(from).join(to);
  return s.trim();
}

/**
 * Parse a .bib file. Tolerant: unparsable entries become diagnostics rather
 * than throwing, so a half-typed reference never breaks the editor.
 */
export function parseBibtex(src: string): {
  entries: BibEntry[];
  diagnostics: Diagnostic[];
} {
  const entries: BibEntry[] = [];
  const diagnostics: Diagnostic[] = [];
  const lineOf = (idx: number) => src.slice(0, idx).split("\n").length;
  const re = /@(\w+)\s*\{/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(src))) {
    const type = (m[1] ?? "").toLowerCase();
    if (type === "comment" || type === "preamble") continue;
    const open = m.index + m[0].length - 1;
    const group = readGroup(src, open);
    if (!group) {
      diagnostics.push({
        level: "error",
        line: lineOf(m.index),
        message: `Unclosed @${type} entry — missing a closing brace.`,
      });
      continue;
    }
    const inner = group.value;
    const commaAt = inner.indexOf(",");
    const key = (commaAt === -1 ? inner : inner.slice(0, commaAt)).trim();
    if (!key) {
      diagnostics.push({
        level: "error",
        line: lineOf(m.index),
        message: `@${type} entry has no citation key.`,
      });
      re.lastIndex = group.end;
      continue;
    }
    if (type === "string") {
      re.lastIndex = group.end;
      continue;
    }

    const fields: Record<string, string> = {};
    let i = commaAt === -1 ? inner.length : commaAt + 1;
    while (i < inner.length) {
      const fm = /^\s*(\w+)\s*=\s*/.exec(inner.slice(i));
      if (!fm) break;
      i += fm[0].length;
      let value = "";
      if (inner[i] === "{") {
        const g = readGroup(inner, i);
        if (!g) break;
        value = g.value;
        i = g.end;
      } else if (inner[i] === '"') {
        const close = inner.indexOf('"', i + 1);
        if (close === -1) break;
        value = inner.slice(i + 1, close);
        i = close + 1;
      } else {
        const stop = inner.slice(i).search(/[,\n]/);
        value = stop === -1 ? inner.slice(i) : inner.slice(i, i + stop);
        i += value.length;
      }
      fields[(fm[1] ?? "").toLowerCase()] = value.trim();
      const nextComma = inner.indexOf(",", i);
      if (nextComma === -1) break;
      i = nextComma + 1;
    }

    if (entries.some((e) => e.key === key)) {
      diagnostics.push({
        level: "warning",
        line: lineOf(m.index),
        message: `Duplicate citation key "${key}" — the first definition wins.`,
      });
    } else {
      entries.push({ key, type, fields });
    }
    re.lastIndex = group.end;
  }

  return { entries, diagnostics };
}

/** "Last, F." style author list, truncated with "et al." past three names. */
function formatAuthors(raw: string): string {
  const names = cleanBibValue(raw)
    .split(/\s+and\s+/i)
    .map((n) => n.trim())
    .filter(Boolean);
  if (names.length === 0) return "";
  const shown = names.length > 3 ? names.slice(0, 3) : names;
  const out = shown.join(", ");
  return names.length > 3 ? `${out}, et al.` : out;
}

/**
 * Render a BibTeX entry as the plain-string reference the site stores in
 * `bibliography` frontmatter and renders in the References list.
 */
export function formatBibEntry(e: BibEntry): string {
  const f = (k: string) => (e.fields[k] ? cleanBibValue(e.fields[k]) : "");
  const parts: string[] = [];
  const authors = e.fields.author ? formatAuthors(e.fields.author) : "";
  if (authors) parts.push(authors);
  const year = f("year");
  if (year) parts.push(`(${year})`);
  const title = f("title");
  if (title) parts.push(`${title}.`);
  const venue = f("journal") || f("booktitle") || f("publisher") || f("school");
  if (venue) parts.push(`${venue}${f("volume") ? ` ${f("volume")}` : ""}.`);
  const pages = f("pages");
  if (pages) parts.push(`pp. ${pages.replace(/--/g, "–")}.`);
  const doi = f("doi");
  if (doi) parts.push(`doi:${doi}`);
  else if (f("url")) parts.push(f("url"));
  const line = parts.join(" ").replace(/\s+/g, " ").trim();
  return line || e.key;
}

/** Serialise an entry back to BibTeX (used by the "add reference" form). */
export function toBibtex(e: BibEntry): string {
  const body = Object.entries(e.fields)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `  ${k} = {${v.trim()}}`)
    .join(",\n");
  return `@${e.type}{${e.key},\n${body}\n}`;
}

/** Derive a stable citation key: lastname + year + first title word. */
export function suggestCiteKey(author: string, year: string, title: string): string {
  const last =
    cleanBibValue(author)
      .split(/\s+and\s+/i)[0]
      ?.split(",")[0]
      ?.trim()
      .split(/\s+/)
      .pop() ?? "ref";
  const word =
    cleanBibValue(title)
      .split(/\s+/)
      .find((w) => w.length > 3) ?? "";
  return [last, year, word]
    .filter(Boolean)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/* ————————————————————————————————————————————————————————————————
   Document AST
   ———————————————————————————————————————————————————————————————— */

export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "sc"; c: Inline[] }
  | { t: "u"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "math"; tex: string }
  | { t: "link"; href: string; c: Inline[] }
  | { t: "cite"; keys: string[]; nums: number[] }
  | { t: "footnote"; n: number }
  | { t: "ref"; label: string; kind: "eq" | "plain" | "auto" }
  | { t: "break" };

/** Environments that render through the site's MathBlock components. */
export const THEOREM_ENVS = [
  "theorem",
  "lemma",
  "corollary",
  "proposition",
  "definition",
  "remark",
  "example",
  "question",
  "keyidea",
] as const;

export type TheoremEnv = (typeof THEOREM_ENVS)[number];

/**
 * Where a block came from in the main file (1-based, inclusive). The visual
 * editor uses these to map a rendered block back to the lines that produced
 * it, so an edit there is an edit to the real source.
 */
export interface BlockSource {
  from?: number;
  to?: number;
}

export type Block = BlockSource &
  (
    | { t: "heading"; depth: 2 | 3 | 4; label?: string; number: string; c: Inline[] }
    | { t: "para"; c: Inline[] }
    | { t: "math"; tex: string; number?: number; label?: string }
    | { t: "list"; ordered: boolean; items: Block[][] }
    | {
        t: "theorem";
        env: TheoremEnv;
        title?: string;
        n: number;
        label?: string;
        c: Block[];
      }
    | { t: "proof"; c: Block[] }
    | { t: "quote"; c: Block[] }
    | { t: "code"; lang?: string; value: string }
    | { t: "figure"; src: string; alt: string; caption?: string }
    | { t: "table"; rows: Inline[][][]; header: boolean }
    | { t: "callout"; kind: "note" | "warning" | "idea"; c: Block[] }
  );

export interface FootnoteDef {
  n: number;
  c: Inline[];
}

export interface LatexDoc {
  meta: { title?: string; author?: string; date?: string; abstract?: Inline[] };
  blocks: Block[];
  footnotes: FootnoteDef[];
  /** Cited entries in order of first appearance. */
  citations: { key: string; n: number; entry?: BibEntry }[];
  /** label → how a \ref to it renders. */
  labels: Record<string, LabelInfo>;
  /**
   * True when every block's from/to lines address main.tex exactly. Inlining
   * \input files or a multi-line macro moves lines around, and the visual
   * editor must not write back through a map it cannot trust.
   */
  sourceMapExact: boolean;
  diagnostics: Diagnostic[];
  stats: {
    words: number;
    equations: number;
    theorems: number;
    citations: number;
    footnotes: number;
    figures: number;
  };
}

/* ————————————————————————————————————————————————————————————————
   Preprocessing
   ———————————————————————————————————————————————————————————————— */

export interface LatexFiles {
  [name: string]: string;
}

/** Inline \input/\include, depth-limited so a cycle cannot hang the editor. */
function resolveInputs(
  src: string,
  files: LatexFiles,
  diagnostics: Diagnostic[],
  depth = 0,
  seen: string[] = [],
  inlined: { any: boolean } = { any: false },
): string {
  if (depth > 4) return src;
  return src.replace(/\\(?:input|include)\{([^}]+)\}/g, (whole, nameRaw: string) => {
    const name = nameRaw.trim();
    const candidates = [name, `${name}.tex`];
    const hit = candidates.find((c) => c in files);
    const line = src.slice(0, src.indexOf(whole)).split("\n").length;
    if (!hit) {
      diagnostics.push({
        level: "error",
        line,
        message: `File not found: \\input{${name}} — add it in the file tree.`,
      });
      return "";
    }
    if (seen.includes(hit)) {
      diagnostics.push({
        level: "error",
        line,
        message: `Circular \\input{${name}} ignored.`,
      });
      return "";
    }
    inlined.any = true;
    return resolveInputs(
      files[hit] ?? "",
      files,
      diagnostics,
      depth + 1,
      [...seen, hit],
      inlined,
    );
  });
}

/** Remove % comments, honouring \% and verbatim regions. */
function stripComments(src: string): string {
  const out: string[] = [];
  let verbatim = false;
  for (const line of src.split("\n")) {
    if (/\\begin\{(verbatim|lstlisting)\}/.test(line)) verbatim = true;
    if (verbatim) {
      out.push(line);
      if (/\\end\{(verbatim|lstlisting)\}/.test(line)) verbatim = false;
      continue;
    }
    let cut = -1;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === "\\") {
        i++;
        continue;
      }
      if (line[i] === "%") {
        cut = i;
        break;
      }
    }
    out.push(cut === -1 ? line : line.slice(0, cut));
  }
  return out.join("\n");
}

interface Macro {
  args: number;
  body: string;
}

/** Collect \newcommand definitions and expand them (bounded passes). */
function applyMacros(src: string, macros: Record<string, Macro>): string {
  let out = src;
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (const [name, macro] of Object.entries(macros)) {
      const re = new RegExp(`\\\\${name}(?![a-zA-Z])`, "g");
      let m: RegExpExecArray | null;
      let next = "";
      let last = 0;
      while ((m = re.exec(out))) {
        let i = m.index + m[0].length;
        const args: string[] = [];
        for (let a = 0; a < macro.args; a++) {
          while (out[i] === " ") i++;
          const g = readGroup(out, i);
          if (!g) break;
          args.push(g.value);
          i = g.end;
        }
        if (args.length < macro.args) continue;
        let body = macro.body;
        args.forEach((arg, idx) => {
          body = body.split(`#${idx + 1}`).join(arg);
        });
        next += out.slice(last, m.index) + body;
        last = i;
        changed = true;
        re.lastIndex = m.index + m[0].length;
      }
      if (last > 0) out = next + out.slice(last);
    }
    if (!changed) break;
  }
  return out;
}

function collectMacros(
  preamble: string,
  diagnostics: Diagnostic[],
): Record<string, Macro> {
  const macros: Record<string, Macro> = {};
  const re =
    /\\(?:newcommand|renewcommand|providecommand)\s*\{?\\(\w+)\}?\s*(\[(\d)\])?\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(preamble))) {
    const g = readGroup(preamble, re.lastIndex);
    if (!g) continue;
    macros[m[1] ?? ""] = { args: m[3] ? Number(m[3]) : 0, body: g.value };
    re.lastIndex = g.end;
  }
  const ops = /\\DeclareMathOperator\s*\{?\\(\w+)\}?\s*\{([^}]*)\}/g;
  while ((m = ops.exec(preamble))) {
    macros[m[1] ?? ""] = { args: 0, body: `\\operatorname{${m[2] ?? ""}}` };
  }
  if (Object.keys(macros).length > 0) {
    diagnostics.push({
      level: "info",
      line: 0,
      message: `Expanded ${Object.keys(macros).length} custom macro${
        Object.keys(macros).length === 1 ? "" : "s"
      } from the preamble.`,
    });
  }
  return macros;
}

/* ————————————————————————————————————————————————————————————————
   Parse context
   ———————————————————————————————————————————————————————————————— */

interface Ctx {
  diagnostics: Diagnostic[];
  bib: BibEntry[];
  citations: { key: string; n: number; entry?: BibEntry }[];
  footnotes: FootnoteDef[];
  labels: Record<string, LabelInfo>;
  theoremAliases: Record<string, TheoremEnv>;
  counters: { sec: number; sub: number; subsub: number; eq: number; thm: number };
  line: number;
  unknown: Set<string>;
  usedRefs: Set<string>;
}

function warnOnce(
  ctx: Ctx,
  key: string,
  message: string,
  level: DiagnosticLevel = "warning",
) {
  if (ctx.unknown.has(key)) return;
  ctx.unknown.add(key);
  ctx.diagnostics.push({ level, line: ctx.line, message });
}

function citeNumber(ctx: Ctx, key: string): number {
  const found = ctx.citations.find((c) => c.key === key);
  if (found) return found.n;
  const entry = ctx.bib.find((e) => e.key === key);
  if (!entry) {
    ctx.diagnostics.push({
      level: "error",
      line: ctx.line,
      message: `Citation "${key}" is not in references.bib.`,
    });
  }
  const n = ctx.citations.length + 1;
  ctx.citations.push({ key, n, entry });
  return n;
}

/* ————————————————————————————————————————————————————————————————
   Inline parser
   ———————————————————————————————————————————————————————————————— */

const SIMPLE_TEXT: Record<string, string> = {
  ldots: "…",
  dots: "…",
  textellipsis: "…",
  LaTeX: "LaTeX",
  TeX: "TeX",
  today: "",
  quad: " ",
  qquad: "  ",
  noindent: "",
  centering: "",
  bigskip: "",
  medskip: "",
  smallskip: "",
  hfill: " ",
  par: "\n",
};

const WRAPPERS: Record<string, "strong" | "em" | "sc" | "u"> = {
  textbf: "strong",
  bf: "strong",
  strong: "strong",
  textit: "em",
  emph: "em",
  it: "em",
  textsl: "em",
  textsc: "sc",
  underline: "u",
  uline: "u",
};

function pushText(out: Inline[], v: string) {
  if (!v) return;
  const last = out[out.length - 1];
  if (last && last.t === "text") last.v += v;
  else out.push({ t: "text", v });
}

/** Parse a run of LaTeX text (no environments) into inline nodes. */
export function parseInline(src: string, ctx: Ctx): Inline[] {
  const out: Inline[] = [];
  let i = 0;

  while (i < src.length) {
    const c = src[i] ?? "";

    // display math inside a paragraph
    if (src.startsWith("$$", i) || src.startsWith("\\[", i)) {
      const close = src.startsWith("$$", i) ? "$$" : "\\]";
      const end = src.indexOf(close, i + 2);
      const tex = end === -1 ? src.slice(i + 2) : src.slice(i + 2, end);
      out.push({ t: "math", tex: tex.trim() });
      i = end === -1 ? src.length : end + close.length;
      continue;
    }

    // inline math
    if (c === "$" || src.startsWith("\\(", i)) {
      const open = c === "$" ? 1 : 2;
      const close = c === "$" ? "$" : "\\)";
      let end = -1;
      for (let j = i + open; j < src.length; j++) {
        if (src[j] === "\\") {
          j++;
          continue;
        }
        if (src.startsWith(close, j)) {
          end = j;
          break;
        }
      }
      if (end === -1) {
        ctx.diagnostics.push({
          level: "error",
          line: ctx.line,
          message: "Unclosed inline math — a $ has no matching $.",
        });
        pushText(out, src.slice(i + open));
        break;
      }
      out.push({ t: "math", tex: src.slice(i + open, end).trim() });
      i = end + close.length;
      continue;
    }

    if (c === "\\") {
      // line break
      if (src.startsWith("\\\\", i)) {
        out.push({ t: "break" });
        i += 2;
        while (src[i] === " ") i++;
        continue;
      }
      const nameMatch = /^\\([a-zA-Z]+)\*?/.exec(src.slice(i));
      if (!nameMatch) {
        // escaped literal such as \& \% \_ \# \$ \{ \}
        const lit = src[i + 1] ?? "";
        pushText(out, lit);
        i += 2;
        continue;
      }
      const name = nameMatch[1] ?? "";
      let j = i + nameMatch[0].length;

      const arg = (): string | null => {
        while (src[j] === " ") j++;
        const g = readGroup(src, j);
        if (!g) return null;
        j = g.end;
        return g.value;
      };
      const opt = (): string | null => {
        const o = readOptional(src, j);
        if (!o) return null;
        j = o.end;
        return o.value;
      };

      const wrapper = WRAPPERS[name];
      if (wrapper) {
        const inner = arg();
        if (inner === null) {
          // \bf style switch: applies to the rest of the group
          out.push({ t: wrapper, c: parseInline(src.slice(j), ctx) } as Inline);
          return out;
        }
        out.push({ t: wrapper, c: parseInline(inner, ctx) } as Inline);
        i = j;
        continue;
      }

      if (name === "texttt" || name === "verb" || name === "lstinline") {
        if (name === "verb" || name === "lstinline") {
          const delim = src[j] ?? "|";
          const end = src.indexOf(delim, j + 1);
          const value = end === -1 ? src.slice(j + 1) : src.slice(j + 1, end);
          out.push({ t: "code", v: value });
          i = end === -1 ? src.length : end + 1;
          continue;
        }
        const inner = arg() ?? "";
        out.push({ t: "code", v: inner });
        i = j;
        continue;
      }

      if (name === "footnote") {
        const inner = arg() ?? "";
        const n = ctx.footnotes.length + 1;
        ctx.footnotes.push({ n, c: parseInline(inner, ctx) });
        out.push({ t: "footnote", n });
        i = j;
        continue;
      }

      if (
        name === "cite" ||
        name === "citep" ||
        name === "citet" ||
        name === "parencite"
      ) {
        opt();
        const inner = arg() ?? "";
        const keys = inner
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean);
        out.push({ t: "cite", keys, nums: keys.map((k) => citeNumber(ctx, k)) });
        i = j;
        continue;
      }

      if (name === "ref" || name === "eqref" || name === "autoref" || name === "cref") {
        const inner = (arg() ?? "").trim();
        ctx.usedRefs.add(inner);
        out.push({
          t: "ref",
          label: inner,
          kind: name === "eqref" ? "eq" : name === "ref" ? "plain" : "auto",
        });
        i = j;
        continue;
      }

      if (name === "href") {
        const url = arg() ?? "";
        const text = arg() ?? url;
        out.push({ t: "link", href: url, c: parseInline(text, ctx) });
        i = j;
        continue;
      }

      if (name === "url") {
        const url = arg() ?? "";
        out.push({ t: "link", href: url, c: [{ t: "text", v: url }] });
        i = j;
        continue;
      }

      if (name === "label") {
        // handled by the block layer; ignore stray inline labels
        arg();
        i = j;
        continue;
      }

      if (
        name === "text" ||
        name === "mbox" ||
        name === "textnormal" ||
        name === "textrm"
      ) {
        const inner = arg() ?? "";
        out.push(...parseInline(inner, ctx));
        i = j;
        continue;
      }

      const simple = SIMPLE_TEXT[name];
      if (simple !== undefined) {
        pushText(out, simple);
        i = j;
        continue;
      }

      // unknown command: keep its argument text, note it in the log
      const inner = arg();
      warnOnce(
        ctx,
        `cmd:${name}`,
        inner === null
          ? `Unknown command \\${name} — dropped from the output.`
          : `Unknown command \\${name} — kept its text, dropped the formatting.`,
      );
      if (inner !== null) out.push(...parseInline(inner, ctx));
      i = j;
      continue;
    }

    if (c === "{") {
      const g = readGroup(src, i);
      if (g) {
        out.push(...parseInline(g.value, ctx));
        i = g.end;
        continue;
      }
      ctx.diagnostics.push({
        level: "error",
        line: ctx.line,
        message: "Unbalanced { — the group is never closed.",
      });
      i++;
      continue;
    }
    if (c === "}") {
      ctx.diagnostics.push({
        level: "error",
        line: ctx.line,
        message: "Unbalanced } — no group is open here.",
      });
      i++;
      continue;
    }

    if (src.startsWith("---", i)) {
      pushText(out, "—");
      i += 3;
      continue;
    }
    if (src.startsWith("--", i)) {
      pushText(out, "–");
      i += 2;
      continue;
    }
    if (src.startsWith("``", i)) {
      pushText(out, "“");
      i += 2;
      continue;
    }
    if (src.startsWith("''", i)) {
      pushText(out, "”");
      i += 2;
      continue;
    }
    if (c === "~") {
      pushText(out, " ");
      i++;
      continue;
    }

    pushText(out, c);
    i++;
  }

  return out;
}

/* ————————————————————————————————————————————————————————————————
   Block parser
   ———————————————————————————————————————————————————————————————— */

interface Line {
  n: number;
  text: string;
}

const MATH_ENVS = [
  "equation",
  "align",
  "gather",
  "multline",
  "displaymath",
  "eqnarray",
  "alignat",
  "flalign",
  "split",
];

/** Environments KaTeX understands as-is inside display math. */
const KATEX_ENVS: Record<string, string> = {
  align: "aligned",
  "align*": "aligned",
  alignat: "aligned",
  "alignat*": "aligned",
  flalign: "aligned",
  "flalign*": "aligned",
  eqnarray: "aligned",
  "eqnarray*": "aligned",
  gather: "gathered",
  "gather*": "gathered",
  multline: "gathered",
  "multline*": "gathered",
  split: "aligned",
};

function baseEnv(env: string): string {
  return env.replace(/\*$/, "");
}

/** Index of the \end matching the \begin{env} on line `start`. */
function findEnd(lines: Line[], start: number, env: string): number {
  let depth = 0;
  for (let i = start; i < lines.length; i++) {
    const text = lines[i]?.text ?? "";
    const begins = [...text.matchAll(/\\begin\{([^}]+)\}/g)];
    const ends = [...text.matchAll(/\\end\{([^}]+)\}/g)];
    for (const b of begins) if (b[1] === env) depth++;
    for (const e of ends) {
      if (e[1] === env) {
        depth--;
        if (depth === 0) return i;
      }
    }
  }
  return -1;
}

/** Pull \label{…} out of a chunk, returning the label and the cleaned text. */
function takeLabel(text: string): { label?: string; text: string } {
  let label: string | undefined;
  const cleaned = text.replace(/\\label\{([^}]*)\}/g, (_m, l: string) => {
    label ??= l.trim();
    return "";
  });
  return { label, text: cleaned };
}

function sectionNumber(ctx: Ctx, depth: 2 | 3 | 4): string {
  if (depth === 2) {
    ctx.counters.sec++;
    ctx.counters.sub = 0;
    ctx.counters.subsub = 0;
    return String(ctx.counters.sec);
  }
  if (depth === 3) {
    ctx.counters.sub++;
    ctx.counters.subsub = 0;
    return `${ctx.counters.sec}.${ctx.counters.sub}`;
  }
  ctx.counters.subsub++;
  return `${ctx.counters.sec}.${ctx.counters.sub}.${ctx.counters.subsub}`;
}

function splitItems(lines: Line[]): Line[][] {
  const items: Line[][] = [];
  let current: Line[] | null = null;
  let depth = 0;
  for (const line of lines) {
    const opens = (line.text.match(/\\begin\{/g) ?? []).length;
    const closes = (line.text.match(/\\end\{/g) ?? []).length;
    const isItem = depth === 0 && /^\s*\\item\b/.test(line.text);
    if (isItem) {
      current = [];
      items.push(current);
      const rest = line.text.replace(/^\s*\\item\s*(\[[^\]]*\]\s*)?/, "");
      current.push({ n: line.n, text: rest });
    } else if (current) {
      current.push(line);
    }
    depth += opens - closes;
  }
  return items;
}

function parseBlocks(lines: Line[], ctx: Ctx): Block[] {
  const blocks: Block[] = [];
  let para: Line[] = [];

  /** Push a block together with the source lines it was built from. */
  const emit = (block: Block, from: number, to: number) => {
    blocks.push({ ...block, from, to });
  };

  const flush = () => {
    const first = para[0];
    if (!first) return;
    ctx.line = first.n;
    const { label, text } = takeLabel(para.map((l) => l.text).join("\n"));
    const inline = parseInline(text.trim(), ctx);
    if (label)
      setLabel(ctx, label, {
        kind: "sec",
        number: String(ctx.counters.sec),
        display: `Section ${ctx.counters.sec}`,
      });
    if (inline.length > 0)
      emit({ t: "para", c: inline }, first.n, para[para.length - 1]?.n ?? first.n);
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const text = line.text;
    ctx.line = line.n;

    if (!text.trim()) {
      flush();
      continue;
    }

    // ---- environments
    const begin = /^\s*\\begin\{([^}]+)\}\s*(.*)$/.exec(text);
    if (begin) {
      const env = begin[1] ?? "";
      const end = findEnd(lines, i, env);
      if (end === -1) {
        ctx.diagnostics.push({
          level: "error",
          line: line.n,
          message: `\\begin{${env}} is never closed.`,
        });
        flush();
        continue;
      }
      flush();
      const innerLines: Line[] = [];
      const firstRest = begin[2] ?? "";
      if (i === end) {
        const only = /^(.*)\\end\{[^}]+\}\s*$/.exec(firstRest);
        if (only) innerLines.push({ n: line.n, text: only[1] ?? "" });
      } else {
        if (firstRest.trim()) innerLines.push({ n: line.n, text: firstRest });
        for (let k = i + 1; k < end; k++) {
          const l = lines[k];
          if (l) innerLines.push(l);
        }
        const endLine = lines[end];
        const lastText = (endLine?.text ?? "").replace(/\\end\{[^}]+\}.*$/, "");
        if (lastText.trim() && endLine) innerLines.push({ n: endLine.n, text: lastText });
      }
      const innerText = innerLines.map((l) => l.text).join("\n");
      const base = baseEnv(env);
      const envFrom = line.n;
      const envTo = lines[end]?.n ?? line.n;

      if (MATH_ENVS.includes(base)) {
        const { label, text: mathText } = takeLabel(innerText);
        const numbered = !env.endsWith("*");
        const wrapper = KATEX_ENVS[env];
        const tex = wrapper
          ? `\\begin{${wrapper}}${mathText.trim()}\\end{${wrapper}}`
          : mathText.trim();
        let number: number | undefined;
        if (numbered) {
          ctx.counters.eq++;
          number = ctx.counters.eq;
          if (label)
            setLabel(ctx, label, {
              kind: "eq",
              number: String(number),
              display: `(${number})`,
            });
        }
        emit({ t: "math", tex, number, label }, envFrom, envTo);
        i = end;
        continue;
      }

      if (base === "itemize" || base === "enumerate" || base === "description") {
        const items = splitItems(innerLines);
        if (items.length === 0) {
          ctx.diagnostics.push({
            level: "warning",
            line: line.n,
            message: `${env} has no \\item entries.`,
          });
        }
        emit(
          {
            t: "list",
            ordered: base === "enumerate",
            items: items.map((it) => parseBlocks(it, ctx)),
          },
          envFrom,
          envTo,
        );
        i = end;
        continue;
      }

      const theoremEnv = ctx.theoremAliases[base];
      if (theoremEnv) {
        const optTitle = readOptional(firstRest.trimStart(), 0);
        let bodyLines = innerLines;
        if (optTitle) {
          bodyLines = innerLines.map((l, idx) =>
            idx === 0 ? { n: l.n, text: l.text.trimStart().slice(optTitle.end) } : l,
          );
        }
        const joined = bodyLines.map((l) => l.text).join("\n");
        const { label, text: cleaned } = takeLabel(joined);
        let n = 0;
        if (!UNNUMBERED_ENVS.has(theoremEnv)) {
          ctx.counters.thm++;
          n = ctx.counters.thm;
        }
        if (label)
          setLabel(ctx, label, {
            kind: "thm",
            number: String(n),
            display: n
              ? `${THEOREM_LABELS[theoremEnv]} ${n}`
              : THEOREM_LABELS[theoremEnv],
          });
        emit(
          {
            t: "theorem",
            env: theoremEnv,
            title: optTitle ? optTitle.value : undefined,
            n,
            label,
            c: parseBlocks(
              cleaned
                .split("\n")
                .map((t, k) => ({ n: bodyLines[k]?.n ?? line.n, text: t })),
              ctx,
            ),
          },
          envFrom,
          envTo,
        );
        i = end;
        continue;
      }

      if (base === "proof") {
        emit({ t: "proof", c: parseBlocks(innerLines, ctx) }, envFrom, envTo);
        i = end;
        continue;
      }

      if (base === "quote" || base === "quotation") {
        emit({ t: "quote", c: parseBlocks(innerLines, ctx) }, envFrom, envTo);
        i = end;
        continue;
      }

      if (base === "verbatim" || base === "lstlisting") {
        const langMatch = /language\s*=\s*(\w+)/.exec(firstRest);
        emit(
          {
            t: "code",
            lang: langMatch?.[1]?.toLowerCase(),
            value: innerLines.map((l) => l.text).join("\n"),
          },
          envFrom,
          envTo,
        );
        i = end;
        continue;
      }

      if (base === "figure") {
        const graphic = /\\includegraphics(?:\[[^\]]*\])?\{([^}]*)\}/.exec(innerText);
        const capMatch = /\\caption\s*\{/.exec(innerText);
        let caption: string | undefined;
        if (capMatch) {
          const g = readGroup(innerText, capMatch.index + capMatch[0].length - 1);
          if (g) caption = g.value.replace(/\s+/g, " ").trim();
        }
        if (!graphic) {
          ctx.diagnostics.push({
            level: "warning",
            line: line.n,
            message: "figure has no \\includegraphics — nothing to show.",
          });
        }
        emit(
          {
            t: "figure",
            src: graphic ? normaliseImagePath(graphic[1] ?? "") : "",
            alt: caption ?? "Figure",
            caption,
          },
          envFrom,
          envTo,
        );
        i = end;
        continue;
      }

      if (base === "tabular" || base === "table") {
        const withoutSpec =
          base === "tabular"
            ? innerText.replace(/^\s*(\[[^\]]*\])?\s*\{[^{}]*\}/, "")
            : (/\\begin\{tabular\}\s*(?:\[[^\]]*\])?\s*\{[^{}]*\}([\s\S]*?)\\end\{tabular\}/.exec(
                innerText,
              )?.[1] ?? "");
        const tabularSrc = withoutSpec;
        const rows = tabularSrc
          .split(/\\\\/)
          .map((r) => r.replace(/\\hline|\\toprule|\\midrule|\\bottomrule/g, "").trim())
          .filter(Boolean)
          .map((r) => r.split("&").map((cell) => parseInline(cell.trim(), ctx)));
        if (rows.length > 0) emit({ t: "table", rows, header: true }, envFrom, envTo);
        else
          ctx.diagnostics.push({
            level: "warning",
            line: line.n,
            message: `${env} produced no rows.`,
          });
        i = end;
        continue;
      }

      if (base === "abstract" || base === "center" || base === "document") {
        blocks.push(...parseBlocks(innerLines, ctx));
        i = end;
        continue;
      }

      warnOnce(
        ctx,
        `env:${base}`,
        `Unknown environment "${base}" — its contents were kept, the environment dropped.`,
      );
      blocks.push(...parseBlocks(innerLines, ctx));
      i = end;
      continue;
    }

    // ---- display math on its own lines
    if (/^\s*(\\\[|\$\$)\s*$/.test(text)) {
      flush();
      const closer = text.trim() === "$$" ? "$$" : "\\]";
      const body: string[] = [];
      let k = i + 1;
      for (; k < lines.length; k++) {
        const t = lines[k]?.text.trim();
        if (t === closer || t === "\\]") break;
        body.push(lines[k]?.text ?? "");
      }
      if (k >= lines.length) {
        ctx.diagnostics.push({
          level: "error",
          line: line.n,
          message: "Display math is never closed.",
        });
      }
      const { label, text: mathText } = takeLabel(body.join("\n"));
      // \[ … \] is unnumbered in LaTeX; a \label on it still needs a number.
      let number: number | undefined;
      if (label) {
        ctx.counters.eq++;
        number = ctx.counters.eq;
        setLabel(ctx, label, {
          kind: "eq",
          number: String(number),
          display: `(${number})`,
        });
      }
      emit(
        { t: "math", tex: mathText.trim(), number, label },
        line.n,
        lines[k]?.n ?? line.n,
      );
      i = k;
      continue;
    }

    // ---- sectioning
    const section = /^\s*\\(section|subsection|subsubsection|paragraph)\*?\s*\{/.exec(
      text,
    );
    if (section) {
      flush();
      const g = readGroup(text, section.index + section[0].length - 1);
      const depth: 2 | 3 | 4 =
        section[1] === "section" ? 2 : section[1] === "subsection" ? 3 : 4;
      const rest = g ? text.slice(g.end) : "";
      const { label } = takeLabel(rest);
      const number = section[0].includes("*") ? "" : sectionNumber(ctx, depth);
      const headingInline = parseInline(g?.value ?? "", ctx);
      const anchor = slugifyHeading(plainText(headingInline));
      if (label)
        setLabel(ctx, label, {
          kind: "sec",
          number,
          display: number ? `Section ${number}` : plainText(headingInline),
          anchor,
        });
      emit({ t: "heading", depth, label, number, c: headingInline }, line.n, line.n);
      const trailing = takeLabel(rest).text.trim();
      if (trailing) para.push({ n: line.n, text: trailing });
      continue;
    }

    // ---- structural no-ops
    if (
      /^\s*\\(maketitle|tableofcontents|newpage|clearpage|bibliographystyle|printbibliography|bibliography|hline|toprule|midrule|bottomrule|vspace\*?|hspace\*?|vfill|newtheorem|appendix|sloppy)\b/.test(
        text,
      )
    ) {
      continue;
    }

    if (/^\s*\\item\b/.test(text)) {
      ctx.diagnostics.push({
        level: "warning",
        line: line.n,
        message: "\\item outside a list environment — rendered as a paragraph.",
      });
      para.push({ n: line.n, text: text.replace(/^\s*\\item\s*/, "• ") });
      continue;
    }

    para.push(line);
  }

  flush();
  return blocks;
}

/** LaTeX graphics paths are extension-less; the site serves from /public. */
function normaliseImagePath(src: string): string {
  const clean = src.trim();
  if (/^https?:\/\//.test(clean) || clean.startsWith("/")) return clean;
  return `/images/${clean}`;
}

/* ————————————————————————————————————————————————————————————————
   Labels & cross-references
   ———————————————————————————————————————————————————————————————— */

export interface LabelInfo {
  kind: "eq" | "sec" | "thm";
  number: string;
  /** How a \ref renders in the preview, e.g. "Theorem 2". */
  display: string;
  /** Heading anchor for MDX links. */
  anchor?: string;
}

function setLabel(ctx: Ctx, label: string, info: LabelInfo) {
  if (ctx.labels[label]) {
    ctx.diagnostics.push({
      level: "warning",
      line: ctx.line,
      message: `Label "${label}" is defined more than once.`,
    });
  }
  ctx.labels[label] = info;
}

/** Mirrors rehype-slug so \ref anchors match the published heading ids. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

const THEOREM_LABELS: Record<TheoremEnv, string> = {
  theorem: "Theorem",
  lemma: "Lemma",
  corollary: "Corollary",
  proposition: "Proposition",
  definition: "Definition",
  remark: "Remark",
  example: "Example",
  question: "Question",
  keyidea: "Key idea",
};

/** The MDX component each environment compiles to. */
const THEOREM_TAGS: Record<TheoremEnv, string> = {
  theorem: "Theorem",
  lemma: "Lemma",
  corollary: "Corollary",
  proposition: "Proposition",
  definition: "Definition",
  remark: "Remark",
  example: "Example",
  question: "Question",
  keyidea: "KeyIdea",
};

/** Decorative glyphs, mirroring the site's callouts. */
const THEOREM_GLYPHS: Partial<Record<TheoremEnv, string>> = {
  keyidea: "💡",
};

/**
 * Informal boxes stay out of the numbered statement sequence — a document
 * reads oddly when "Key idea 4" sits between Theorem 2 and Theorem 3.
 */
const UNNUMBERED_ENVS = new Set<TheoremEnv>(["keyidea"]);

/* ————————————————————————————————————————————————————————————————
   compileLatex — source in, document out
   ———————————————————————————————————————————————————————————————— */

function defaultTheoremAliases(): Record<string, TheoremEnv> {
  const map: Record<string, TheoremEnv> = {};
  for (const env of THEOREM_ENVS) map[env] = env;
  map.thm = "theorem";
  map.lem = "lemma";
  map.cor = "corollary";
  map.prop = "proposition";
  map.defn = "definition";
  map.rem = "remark";
  map.ex = "example";
  map.idea = "keyidea";
  map.insight = "keyidea";
  map.key = "keyidea";
  return map;
}

function readCommandArg(src: string, command: string): string | undefined {
  const m = new RegExp(`\\\\${command}\\s*\\{`).exec(src);
  if (!m) return undefined;
  const g = readGroup(src, m.index + m[0].length - 1);
  return g ? g.value.trim() : undefined;
}

export function compileLatex(
  main: string,
  bibSource = "",
  files: LatexFiles = {},
): LatexDoc {
  const diagnostics: Diagnostic[] = [];
  const bibParsed = parseBibtex(bibSource);
  diagnostics.push(...bibParsed.diagnostics);

  const inlined = { any: false };
  const resolved = resolveInputs(main, files, diagnostics, 0, [], inlined);
  const source = stripComments(resolved);

  const docStart = source.indexOf("\\begin{document}");
  const docEnd = source.lastIndexOf("\\end{document}");
  const preamble = docStart === -1 ? "" : source.slice(0, docStart);
  let body =
    docStart === -1
      ? source
      : source.slice(
          docStart + "\\begin{document}".length,
          docEnd === -1 ? undefined : docEnd,
        );
  if (docStart !== -1 && docEnd === -1) {
    diagnostics.push({
      level: "warning",
      line: source.slice(0, docStart).split("\n").length,
      message: "\\end{document} is missing — compiled to the end of the file.",
    });
  }
  /** Line number of the first body line, so log lines point at the editor. */
  const lineOffset =
    docStart === -1 ? 0 : source.slice(0, docStart).split("\n").length - 1;

  const macros = collectMacros(preamble, diagnostics);
  const theoremAliases = defaultTheoremAliases();
  const newTheorem = /\\newtheorem\*?\s*\{(\w+)\}(?:\[[^\]]*\])?\s*\{([^}]*)\}/g;
  let nt: RegExpExecArray | null;
  while ((nt = newTheorem.exec(preamble))) {
    const display = (nt[2] ?? "").toLowerCase();
    const match = THEOREM_ENVS.find((e) => display.includes(e));
    theoremAliases[nt[1] ?? ""] = match ?? "theorem";
  }

  const linesBeforeMacros = body.split("\n").length;
  body = applyMacros(body, macros);
  const macrosMovedLines = body.split("\n").length !== linesBeforeMacros;

  const ctx: Ctx = {
    diagnostics,
    bib: bibParsed.entries,
    citations: [],
    footnotes: [],
    labels: {},
    theoremAliases,
    counters: { sec: 0, sub: 0, subsub: 0, eq: 0, thm: 0 },
    line: 1,
    unknown: new Set(),
    usedRefs: new Set(),
  };

  const meta: LatexDoc["meta"] = {
    title: readCommandArg(preamble + body, "title"),
    author: readCommandArg(preamble + body, "author"),
    date: readCommandArg(preamble + body, "date"),
  };

  // Abstract becomes the description/lede rather than body copy.
  const abstractMatch = /\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/.exec(body);
  if (abstractMatch) {
    meta.abstract = parseInline((abstractMatch[1] ?? "").trim(), ctx);
    // Blank the abstract rather than deleting it: removing lines would shift
    // every block's source range below it.
    body = body.replace(
      abstractMatch[0],
      "\n".repeat((abstractMatch[0].match(/\n/g) ?? []).length),
    );
    diagnostics.push({
      level: "info",
      line: 0,
      message: "Abstract captured as the post description (not repeated in the body).",
    });
  }

  const lines: Line[] = body
    .split("\n")
    .map((text, idx) => ({ n: idx + 1 + lineOffset, text }));

  const blocks = parseBlocks(lines, ctx);

  for (const label of ctx.usedRefs) {
    if (!ctx.labels[label]) {
      diagnostics.push({
        level: "error",
        line: 0,
        message: `Reference "${label}" has no \\label — it renders as "??".`,
      });
    }
  }
  for (const entry of bibParsed.entries) {
    if (!ctx.citations.some((c) => c.key === entry.key)) {
      diagnostics.push({
        level: "warning",
        line: 0,
        message: `"${entry.key}" is in references.bib but never cited — it is left out of the published bibliography.`,
      });
    }
  }

  const words = countWords(blocks);
  return {
    meta,
    blocks,
    footnotes: ctx.footnotes,
    citations: ctx.citations,
    labels: ctx.labels,
    sourceMapExact: !inlined.any && !macrosMovedLines,
    diagnostics,
    stats: {
      words,
      equations: ctx.counters.eq,
      theorems: ctx.counters.thm,
      citations: ctx.citations.length,
      footnotes: ctx.footnotes.length,
      figures: blocks.filter((b) => b.t === "figure").length,
    },
  };
}

/** Plain-text rendering of an inline run — used for descriptions and counts. */
export function plainText(nodes: Inline[]): string {
  return nodes
    .map((n) => {
      switch (n.t) {
        case "text":
          return n.v;
        case "code":
          return n.v;
        case "math":
          return " ";
        case "strong":
        case "em":
        case "sc":
        case "u":
        case "link":
          return plainText(n.c);
        default:
          return " ";
      }
    })
    .join("");
}

function countWords(blocks: Block[]): number {
  let n = 0;
  const walk = (bs: Block[]) => {
    for (const b of bs) {
      switch (b.t) {
        case "para":
        case "heading":
          n += plainText(b.c).trim().split(/\s+/).filter(Boolean).length;
          break;
        case "list":
          b.items.forEach(walk);
          break;
        case "theorem":
        case "proof":
        case "quote":
        case "callout":
          walk(b.c);
          break;
        default:
          break;
      }
    }
  };
  walk(blocks);
  return n;
}

/** The formatted references for cited entries, in citation order. */
export function bibliographyFor(doc: LatexDoc): string[] {
  return doc.citations.map((c) =>
    c.entry ? formatBibEntry(c.entry) : `${c.key} — TODO(matthew): missing reference`,
  );
}

/* ————————————————————————————————————————————————————————————————
   Emitter — MDX (what gets published)
   ———————————————————————————————————————————————————————————————— */

/** Refuse javascript: and data: URLs before they reach MDX or the preview. */
export function safeHref(href: string): string {
  const trimmed = href.trim();
  if (/^(https?:|mailto:|#|\/|\.)/i.test(trimmed)) return trimmed;
  return "#";
}

/** Escape the characters MDX would otherwise read as JSX or expressions. */
function escapeMdx(v: string): string {
  return v.replace(/([{}<>$])/g, "\\$1");
}

function resolveRef(doc: LatexDoc, label: string): LabelInfo | undefined {
  return doc.labels[label];
}

function inlineToMdx(nodes: Inline[], doc: LatexDoc): string {
  return nodes
    .map((n) => {
      switch (n.t) {
        case "text":
          return escapeMdx(n.v);
        case "strong":
          return `**${inlineToMdx(n.c, doc)}**`;
        case "em":
          return `*${inlineToMdx(n.c, doc)}*`;
        case "u":
          return `<u>${inlineToMdx(n.c, doc)}</u>`;
        case "sc":
          return inlineToMdx(n.c, doc);
        case "code":
          return `\`${n.v}\``;
        case "math":
          return `$${n.tex}$`;
        case "link":
          return `[${inlineToMdx(n.c, doc)}](${safeHref(n.href)})`;
        case "cite":
          return `[\\[${n.nums.join(", ")}\\]](#ref-${n.nums[0] ?? 1})`;
        case "footnote":
          return `[^${n.n}]`;
        case "ref": {
          const info = resolveRef(doc, n.label);
          if (!info) return "??";
          const text =
            n.kind === "eq"
              ? `(${info.number})`
              : n.kind === "auto"
                ? info.display
                : info.number;
          if (info.kind === "sec" && info.anchor) return `[${text}](#${info.anchor})`;
          return text;
        }
        case "break":
          return "  \n";
      }
    })
    .join("");
}

function blocksToMdx(blocks: Block[], doc: LatexDoc, indent = ""): string {
  const out: string[] = [];
  for (const b of blocks) {
    switch (b.t) {
      case "heading": {
        // An empty \section{} is a placeholder, not content — drop it.
        const heading = inlineToMdx(b.c, doc).trim();
        if (heading) out.push(`${"#".repeat(b.depth)} ${heading}`);
        break;
      }
      case "para":
        out.push(inlineToMdx(b.c, doc));
        break;
      case "math": {
        const tag = b.number ? `\\tag{${b.number}}` : "";
        out.push(`$$\n${b.tex}${tag}\n$$`);
        break;
      }
      case "list": {
        const lines = b.items.map((item, idx) => {
          const marker = b.ordered ? `${idx + 1}. ` : "- ";
          const inner = blocksToMdx(item, doc, "  ").trim();
          const [first, ...rest] = inner.split("\n");
          return [
            `${marker}${first}`,
            ...rest.map((l) => (l.trim() ? `  ${l}` : "")),
          ].join("\n");
        });
        out.push(lines.join("\n"));
        break;
      }
      case "theorem": {
        const Tag = THEOREM_TAGS[b.env];
        const title = b.title ? ` title="${b.title.replace(/"/g, "&quot;")}"` : "";
        const n = b.n ? ` n="${b.n}"` : "";
        out.push(`<${Tag}${n}${title}>\n\n${blocksToMdx(b.c, doc)}\n\n</${Tag}>`);
        break;
      }
      case "proof":
        out.push(`<Proof>\n\n${blocksToMdx(b.c, doc)}\n\n</Proof>`);
        break;
      case "quote":
        out.push(
          blocksToMdx(b.c, doc)
            .split("\n")
            .map((l) => (l ? `> ${l}` : ">"))
            .join("\n"),
        );
        break;
      case "code":
        out.push(`\`\`\`${b.lang ?? ""}\n${b.value.replace(/\s+$/, "")}\n\`\`\``);
        break;
      case "figure":
        out.push(
          b.caption
            ? `<Figure caption="${b.caption.replace(/"/g, "&quot;")}">\n\n![${b.alt}](${b.src})\n\n</Figure>`
            : `![${b.alt}](${b.src})`,
        );
        break;
      case "table": {
        const [head, ...rows] = b.rows;
        if (!head) break;
        const row = (cells: Inline[][]) =>
          `| ${cells.map((c) => inlineToMdx(c, doc).replace(/\|/g, "\\|")).join(" | ")} |`;
        out.push(
          [row(head), `| ${head.map(() => "---").join(" | ")} |`, ...rows.map(row)].join(
            "\n",
          ),
        );
        break;
      }
      case "callout":
        out.push(`<Callout kind="${b.kind}">\n\n${blocksToMdx(b.c, doc)}\n\n</Callout>`);
        break;
    }
  }
  return out
    .join("\n\n")
    .split("\n")
    .map((l) => (l ? indent + l : l))
    .join("\n");
}

/** The MDX body written into `content/` — no frontmatter. */
export function emitMdx(doc: LatexDoc): string {
  const parts = [blocksToMdx(doc.blocks, doc)];
  if (doc.footnotes.length > 0) {
    parts.push(
      doc.footnotes.map((f) => `[^${f.n}]: ${inlineToMdx(f.c, doc)}`).join("\n"),
    );
  }
  return (
    parts
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}

/* ————————————————————————————————————————————————————————————————
   Emitter — preview HTML (the "PDF" pane)
   ———————————————————————————————————————————————————————————————— */

export interface PreviewOptions {
  /** Supplied by the client so KaTeX stays out of this module. */
  renderMath?: (tex: string, display: boolean) => string;
}

function esc(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineToHtml(nodes: Inline[], doc: LatexDoc, o: PreviewOptions): string {
  const math = o.renderMath ?? ((tex: string) => `<code>${esc(tex)}</code>`);
  return nodes
    .map((n) => {
      switch (n.t) {
        case "text":
          return esc(n.v);
        case "strong":
          return `<strong>${inlineToHtml(n.c, doc, o)}</strong>`;
        case "em":
          return `<em>${inlineToHtml(n.c, doc, o)}</em>`;
        case "u":
          return `<u>${inlineToHtml(n.c, doc, o)}</u>`;
        case "sc":
          return `<span class="ovl-sc">${inlineToHtml(n.c, doc, o)}</span>`;
        case "code":
          return `<code>${esc(n.v)}</code>`;
        case "math":
          return math(n.tex, false);
        case "link":
          return `<a href="${esc(safeHref(n.href))}" target="_blank" rel="noreferrer">${inlineToHtml(
            n.c,
            doc,
            o,
          )}</a>`;
        case "cite":
          return `<a class="ovl-cite" href="#ovl-ref-${n.nums[0] ?? 1}">[${n.nums.join(", ")}]</a>`;
        case "footnote":
          return `<sup class="ovl-fnref"><a href="#ovl-fn-${n.n}">${n.n}</a></sup>`;
        case "ref": {
          const info = resolveRef(doc, n.label);
          if (!info) return `<span class="ovl-badref">??</span>`;
          return esc(
            n.kind === "eq"
              ? `(${info.number})`
              : n.kind === "auto"
                ? info.display
                : info.number,
          );
        }
        case "break":
          return "<br />";
      }
    })
    .join("");
}

function blocksToHtml(blocks: Block[], doc: LatexDoc, o: PreviewOptions): string {
  const math = o.renderMath ?? ((tex: string) => `<pre>${esc(tex)}</pre>`);
  return blocks
    .map((b) => {
      switch (b.t) {
        case "heading": {
          const tag = `h${b.depth}`;
          const id = b.label ? ` id="${esc(slugifyHeading(plainText(b.c)))}"` : "";
          const num = b.number ? `<span class="ovl-secnum">${b.number}</span>` : "";
          return `<${tag} class="ovl-h"${id}>${num}${inlineToHtml(b.c, doc, o)}</${tag}>`;
        }
        case "para":
          return `<p>${inlineToHtml(b.c, doc, o)}</p>`;
        case "math":
          return `<div class="ovl-eq">${
            b.number ? `<span class="ovl-eqnum">(${b.number})</span>` : ""
          }<div class="ovl-eq-body">${math(b.tex, true)}</div></div>`;
        case "list": {
          const tag = b.ordered ? "ol" : "ul";
          return `<${tag}>${b.items
            .map((it) => `<li>${blocksToHtml(it, doc, o)}</li>`)
            .join("")}</${tag}>`;
        }
        case "theorem": {
          const glyph = THEOREM_GLYPHS[b.env];
          return `<div class="ovl-thm ovl-callout-${b.env}"><span class="ovl-thm-head">${
            glyph ? `<span class="ovl-thm-glyph">${glyph}</span> ` : ""
          }${THEOREM_LABELS[b.env]}${b.n ? ` ${b.n}` : ""}${
            b.title ? ` (${esc(b.title)})` : ""
          }.</span> ${blocksToHtml(b.c, doc, o)}</div>`;
        }
        case "proof":
          return `<div class="ovl-proof"><span class="ovl-proof-head">Proof.</span> ${blocksToHtml(
            b.c,
            doc,
            o,
          )}<span class="ovl-qed">□</span></div>`;
        case "quote":
          return `<blockquote>${blocksToHtml(b.c, doc, o)}</blockquote>`;
        case "code":
          return `<pre class="ovl-verbatim"><code>${esc(b.value)}</code></pre>`;
        case "figure":
          return `<figure class="ovl-figure">${
            b.src ? `<img src="${esc(b.src)}" alt="${esc(b.alt)}" />` : ""
          }${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ""}</figure>`;
        case "table": {
          const [head, ...rows] = b.rows;
          if (!head) return "";
          return `<table class="ovl-table"><thead><tr>${head
            .map((c) => `<th>${inlineToHtml(c, doc, o)}</th>`)
            .join("")}</tr></thead><tbody>${rows
            .map(
              (r) =>
                `<tr>${r.map((c) => `<td>${inlineToHtml(c, doc, o)}</td>`).join("")}</tr>`,
            )
            .join("")}</tbody></table>`;
        }
        case "callout":
          return `<div class="ovl-callout">${blocksToHtml(b.c, doc, o)}</div>`;
      }
    })
    .join("\n");
}

/**
 * Render a single block. The visual editor draws the document block by block
 * so each one can be swapped for its source on click.
 */
export function emitBlockHtml(
  block: Block,
  doc: LatexDoc,
  o: PreviewOptions = {},
): string {
  return blocksToHtml([block], doc, o);
}

/** Render the compiled document as the typeset page shown in the output pane. */
export function emitPreviewHtml(doc: LatexDoc, o: PreviewOptions = {}): string {
  const parts: string[] = [];
  if (doc.meta.title || doc.meta.author || doc.meta.date) {
    parts.push(
      `<div class="ovl-titleblock">${
        doc.meta.title ? `<h1>${esc(doc.meta.title)}</h1>` : ""
      }${doc.meta.author ? `<p class="ovl-author">${esc(doc.meta.author)}</p>` : ""}${
        doc.meta.date ? `<p class="ovl-date">${esc(doc.meta.date)}</p>` : ""
      }</div>`,
    );
  }
  if (doc.meta.abstract) {
    parts.push(
      `<div class="ovl-abstract"><p class="ovl-abstract-head">Abstract</p><p>${inlineToHtml(
        doc.meta.abstract,
        doc,
        o,
      )}</p></div>`,
    );
  }
  parts.push(blocksToHtml(doc.blocks, doc, o));

  if (doc.footnotes.length > 0) {
    parts.push(
      `<div class="ovl-footnotes"><hr />${doc.footnotes
        .map(
          (f) =>
            `<p id="ovl-fn-${f.n}"><sup>${f.n}</sup> ${inlineToHtml(f.c, doc, o)}</p>`,
        )
        .join("")}</div>`,
    );
  }

  const refs = bibliographyFor(doc);
  if (refs.length > 0) {
    parts.push(
      `<div class="ovl-references"><h2 class="ovl-h">References</h2><ol>${refs
        .map((r, i) => `<li id="ovl-ref-${i + 1}">${esc(r)}</li>`)
        .join("")}</ol></div>`,
    );
  }
  return parts.join("\n");
}

/* ————————————————————————————————————————————————————————————————
   Import direction — open existing MDX in the LaTeX editor
   ———————————————————————————————————————————————————————————————— */

/** Escape the characters LaTeX treats specially, outside math and verbatim. */
function escapeTex(v: string): string {
  return v.replace(/([%&#_])/g, "\\$1");
}

function inlineMdxToTex(text: string): string {
  const segments = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*\$|`[^`]*`)/g);
  return segments
    .map((seg) => {
      if (!seg) return "";
      if (seg.startsWith("$")) return seg;
      if (seg.startsWith("`")) return `\\texttt{${seg.slice(1, -1)}}`;
      let s = seg;
      s = s.replace(/\\([{}<>$])/g, "$1");
      s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "\\includegraphics{$2}");
      s = s.replace(/\[\^(\d+)\]/g, "\\footnotemark[$1]");
      s = s.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (_m, label: string, href: string) => `\\href{${href}}{${label}}`,
      );
      s = s.replace(/\*\*([^*]+)\*\*/g, "\\textbf{$1}");
      s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1\\emph{$2}");
      s = escapeTex(s);
      return s;
    })
    .join("");
}

const TEX_ENV_FOR_COMPONENT: Record<string, string> = {
  KeyIdea: "keyidea",
  Theorem: "theorem",
  Lemma: "lemma",
  Corollary: "corollary",
  Proposition: "proposition",
  Definition: "definition",
  Remark: "remark",
  Example: "example",
  Question: "question",
  Proof: "proof",
};

/**
 * Best-effort MDX → LaTeX, so any existing post can be opened in the LaTeX
 * editor. Round-tripping is lossy by nature; the studio says so before it
 * overwrites anything.
 */
export function mdxToLatex(mdx: string): string {
  const lines = mdx.split("\n");
  const out: string[] = [];
  const footnotes: Record<string, string> = {};
  let inCode = false;
  let listMode: "ul" | "ol" | null = null;

  for (const raw of lines) {
    const fnDef = /^\[\^(\d+)\]:\s*(.*)$/.exec(raw);
    if (fnDef && !inCode) {
      footnotes[fnDef[1] ?? ""] = fnDef[2] ?? "";
      continue;
    }
    out.push(raw);
  }

  const body = out.join("\n");
  const result: string[] = [];
  const src = body.split("\n");
  inCode = false;
  let mathOpen = false;

  const closeList = () => {
    if (listMode) {
      result.push(listMode === "ul" ? "\\end{itemize}" : "\\end{enumerate}");
      listMode = null;
    }
  };

  for (let i = 0; i < src.length; i++) {
    const line = src[i] ?? "";

    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      closeList();
      if (inCode) {
        result.push("\\end{lstlisting}");
        inCode = false;
      } else {
        result.push(
          fence[1] ? `\\begin{lstlisting}[language=${fence[1]}]` : "\\begin{lstlisting}",
        );
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      result.push(line);
      continue;
    }

    if (line.trim() === "$$") {
      closeList();
      result.push(mathOpen ? "\\end{equation}" : "\\begin{equation}");
      mathOpen = !mathOpen;
      continue;
    }
    if (mathOpen) {
      result.push(line.replace(/\\tag\{\d+\}/g, ""));
      continue;
    }

    const open = /^<(\w+)([^>]*)>\s*$/.exec(line.trim());
    const openEnv = open ? TEX_ENV_FOR_COMPONENT[open[1] ?? ""] : undefined;
    if (open && openEnv) {
      closeList();
      const title = /title="([^"]*)"/.exec(open[2] ?? "");
      result.push(`\\begin{${openEnv}}${title ? `[${title[1] ?? ""}]` : ""}`);
      continue;
    }
    const close = /^<\/(\w+)>\s*$/.exec(line.trim());
    const closeEnv = close ? TEX_ENV_FOR_COMPONENT[close[1] ?? ""] : undefined;
    if (close && closeEnv) {
      closeList();
      result.push(`\\end{${closeEnv}}`);
      continue;
    }

    const heading = /^(#{2,4})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const depth = (heading[1] ?? "##").length;
      const cmd = depth === 2 ? "section" : depth === 3 ? "subsection" : "subsubsection";
      result.push(`\\${cmd}{${inlineMdxToTex(heading[2] ?? "")}}`);
      continue;
    }

    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ul || ol) {
      const want: "ul" | "ol" = ul ? "ul" : "ol";
      if (listMode !== want) {
        closeList();
        result.push(want === "ul" ? "\\begin{itemize}" : "\\begin{enumerate}");
        listMode = want;
      }
      result.push(`  \\item ${inlineMdxToTex((ul ?? ol)?.[1] ?? "")}`);
      continue;
    }
    if (listMode && !line.trim()) {
      closeList();
      result.push("");
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      closeList();
      result.push(`\\begin{quote}\n${inlineMdxToTex(quote[1] ?? "")}\n\\end{quote}`);
      continue;
    }

    let text = inlineMdxToTex(line);
    text = text.replace(/\\footnotemark\[(\d+)\]/g, (_m, n: string) => {
      const def = footnotes[n];
      return def ? `\\footnote{${inlineMdxToTex(def)}}` : "";
    });
    result.push(text);
  }
  closeList();
  if (inCode) result.push("\\end{lstlisting}");
  if (mathOpen) result.push("\\end{equation}");

  return result
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ————————————————————————————————————————————————————————————————
   Templates
   ———————————————————————————————————————————————————————————————— */

export const PREAMBLE = `\\documentclass[11pt]{article}
\\usepackage{amsmath, amssymb, amsthm}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\newtheorem{theorem}{Theorem}
\\newtheorem{lemma}[theorem]{Lemma}
\\newtheorem{corollary}[theorem]{Corollary}
\\newtheorem{proposition}[theorem]{Proposition}
\\theoremstyle{definition}
\\newtheorem{definition}[theorem]{Definition}
\\newtheorem{example}[theorem]{Example}
\\newtheorem{remark}[theorem]{Remark}`;

export interface TemplateInput {
  title: string;
  author: string;
  date: string;
}

/** A new blank document — no filler prose, just the structure. */
export function blankDocument({ title, author, date }: TemplateInput): string {
  return `${PREAMBLE}

\\title{${title || ""}}
\\author{${author}}
\\date{${date}}

\\begin{document}
\\maketitle

\\begin{abstract}

\\end{abstract}

\\section{}

\\end{document}
`;
}

/** Wrap an already-written body (e.g. imported MDX) in a full document. */
export function wrapDocument(
  body: string,
  { title, author, date }: TemplateInput,
): string {
  return `${PREAMBLE}

\\title{${title || ""}}
\\author{${author}}
\\date{${date}}

\\begin{document}
\\maketitle

${body}

\\end{document}
`;
}

export const BLANK_BIB = `% BibTeX entries. Cite them in main.tex with \\cite{key}.
% Only cited entries are published in the post's References list.
`;
