"use client";

import katex from "katex";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BIB_FILE_NAME,
  MAIN_TEX_NAME,
  type LatexTarget,
} from "@/components/admin/latex-shared";
import {
  bibliographyFor,
  compileLatex,
  emitBlockHtml,
  emitMdx,
  emitPreviewHtml,
  parseBibtex,
  plainText,
  suggestCiteKey,
  toBibtex,
  type Diagnostic,
} from "@/lib/admin/latex";
import { adminFetch } from "@/lib/admin/transport";
import { DOMAINS, domainLabels } from "@/lib/site/domains";
import { NOTE_TYPES, PROBLEM_DIFFICULTIES } from "@/lib/content/schemas";

/* ————————————————————————————————————————————————————————————————
   Syntax highlighting — a <pre> layer sitting under a transparent textarea
   ———————————————————————————————————————————————————————————————— */

function escapeHtml(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const TOKENS =
  /(%[^\n]*)|(\\(?:begin|end)\{[^}\n]*\})|(\$\$[\s\S]*?\$\$|\$[^$\n]*\$)|(\\[a-zA-Z@]+\*?)|(\{|\})/g;

/** Colourise LaTeX for the editor's backdrop layer. Never trusted as markup. */
export function highlightTex(source: string): string {
  let out = "";
  let last = 0;
  for (const m of source.matchAll(TOKENS)) {
    const index = m.index ?? 0;
    out += escapeHtml(source.slice(last, index));
    const cls = m[1]
      ? "tex-comment"
      : m[2]
        ? "tex-env"
        : m[3]
          ? "tex-math"
          : m[4]
            ? "tex-cmd"
            : "tex-brace";
    out += `<span class="${cls}">${escapeHtml(m[0])}</span>`;
    last = index + m[0].length;
  }
  out += escapeHtml(source.slice(last));
  // A trailing newline needs a spacer or the layers drift by one line.
  return out + "\n";
}

/* ————————————————————————————————————————————————————————————————
   Symbol palette
   ———————————————————————————————————————————————————————————————— */

const SYMBOL_GROUPS: { label: string; symbols: [string, string][] }[] = [
  {
    label: "Greek",
    symbols: [
      ["α", "\\alpha"],
      ["β", "\\beta"],
      ["γ", "\\gamma"],
      ["δ", "\\delta"],
      ["ε", "\\varepsilon"],
      ["θ", "\\theta"],
      ["λ", "\\lambda"],
      ["μ", "\\mu"],
      ["π", "\\pi"],
      ["ρ", "\\rho"],
      ["σ", "\\sigma"],
      ["τ", "\\tau"],
      ["φ", "\\varphi"],
      ["ω", "\\omega"],
      ["Γ", "\\Gamma"],
      ["Δ", "\\Delta"],
      ["Θ", "\\Theta"],
      ["Λ", "\\Lambda"],
      ["Σ", "\\Sigma"],
      ["Ω", "\\Omega"],
    ],
  },
  {
    label: "Operators",
    symbols: [
      ["∑", "\\sum_{i=1}^{n} "],
      ["∏", "\\prod_{i=1}^{n} "],
      ["∫", "\\int_{a}^{b} "],
      ["∮", "\\oint "],
      ["√", "\\sqrt{}"],
      ["ⁿ√", "\\sqrt[n]{}"],
      ["a/b", "\\frac{}{}"],
      ["∂", "\\partial "],
      ["∇", "\\nabla "],
      ["lim", "\\lim_{n \\to \\infty} "],
      ["±", "\\pm "],
      ["×", "\\times "],
      ["·", "\\cdot "],
      ["÷", "\\div "],
    ],
  },
  {
    label: "Relations",
    symbols: [
      ["≤", "\\leq "],
      ["≥", "\\geq "],
      ["≠", "\\neq "],
      ["≈", "\\approx "],
      ["≡", "\\equiv "],
      ["∼", "\\sim "],
      ["∝", "\\propto "],
      ["∈", "\\in "],
      ["∉", "\\notin "],
      ["⊂", "\\subset "],
      ["⊆", "\\subseteq "],
      ["∪", "\\cup "],
      ["∩", "\\cap "],
      ["∅", "\\emptyset "],
    ],
  },
  {
    label: "Arrows",
    symbols: [
      ["→", "\\to "],
      ["←", "\\leftarrow "],
      ["⇒", "\\Rightarrow "],
      ["⇐", "\\Leftarrow "],
      ["⇔", "\\iff "],
      ["↦", "\\mapsto "],
      ["↑", "\\uparrow "],
      ["↓", "\\downarrow "],
    ],
  },
  {
    label: "Sets & logic",
    symbols: [
      ["ℝ", "\\mathbb{R}"],
      ["ℕ", "\\mathbb{N}"],
      ["ℤ", "\\mathbb{Z}"],
      ["ℚ", "\\mathbb{Q}"],
      ["ℂ", "\\mathbb{C}"],
      ["𝔼", "\\mathbb{E}"],
      ["ℙ", "\\mathbb{P}"],
      ["∀", "\\forall "],
      ["∃", "\\exists "],
      ["¬", "\\neg "],
      ["∧", "\\land "],
      ["∨", "\\lor "],
      ["∞", "\\infty "],
      ["□", "\\square "],
    ],
  },
];

const SNIPPETS: { label: string; insert: string; hint: string }[] = [
  {
    label: "Section",
    insert: "\\section{}\n",
    hint: "Numbered heading",
  },
  {
    label: "Equation",
    insert: "\\begin{equation}\\label{eq:}\n  \n\\end{equation}\n",
    hint: "Numbered, referenceable",
  },
  {
    label: "Align",
    insert: "\\begin{align}\n  a &= b \\\\\n  c &= d\n\\end{align}\n",
    hint: "Multi-line alignment",
  },
  {
    label: "List",
    insert: "\\begin{itemize}\n  \\item \n  \\item \n\\end{itemize}\n",
    hint: "Bulleted",
  },
  {
    label: "Figure",
    insert: "\\begin{figure}\n  \\includegraphics{}\n  \\caption{}\n\\end{figure}\n",
    hint: "Image from /public/images",
  },
  {
    label: "Table",
    insert:
      "\\begin{tabular}{ll}\n  Header & Header \\\\\n  Cell & Cell \\\\\n\\end{tabular}\n",
    hint: "First row is the header",
  },
  { label: "Footnote", insert: "\\footnote{}", hint: "Renders as [^n]" },
  { label: "Citation", insert: "\\cite{}", hint: "Key from references.bib" },
];

/* ————————————————————————————————————————————————————————————————
   Studio
   ———————————————————————————————————————————————————————————————— */

type SaveState = "clean" | "dirty" | "saving" | "saved" | "error";

export interface LatexStudioProps {
  target: LatexTarget;
  /** Called after a successful write so the library list can refresh. */
  onSaved: (message: string) => void;
  onExit: () => void;
}

export function LatexStudio({ target, onSaved, onExit }: LatexStudioProps) {
  const [files, setFiles] = useState<Record<string, string>>(target.files);
  const [active, setActive] = useState<string>(MAIN_TEX_NAME);
  const [meta, setMeta] = useState(target.meta);
  const [slug, setSlug] = useState(target.slug);

  const [mode, setMode] = useState<"code" | "visual">("code");
  const [autoCompile, setAutoCompile] = useState(true);
  const [compiled, setCompiled] = useState<Record<string, string>>(target.files);
  const [logOpen, setLogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [split, setSplit] = useState(0.5);
  const [saveState, setSaveState] = useState<SaveState>("clean");
  const [message, setMessage] = useState<string | null>(null);
  const [issues, setIssues] = useState<{ field: string; message: string }[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const visualApi = useRef<VisualApi | null>(null);

  const source = files[active] ?? "";
  const dirty = saveState === "dirty" || saveState === "error";

  /* —— compile ——————————————————————————————————————————————— */

  // Auto-compile mirrors Overleaf: recompile after a pause in typing.
  useEffect(() => {
    if (!autoCompile) return;
    const id = setTimeout(() => setCompiled(files), 500);
    return () => clearTimeout(id);
  }, [files, autoCompile]);

  const recompile = useCallback(() => setCompiled(files), [files]);

  const renderMath = useCallback((tex: string, display: boolean) => {
    try {
      return katex.renderToString(tex, {
        displayMode: display,
        throwOnError: true,
        strict: false,
        trust: false,
      });
    } catch {
      return `<span class="ovl-matherr">${escapeHtml(tex)}</span>`;
    }
  }, []);

  const { doc, html, mathErrors } = useMemo(() => {
    const mathErrors: Diagnostic[] = [];
    const compiledDoc = compileLatex(
      compiled[MAIN_TEX_NAME] ?? "",
      compiled[BIB_FILE_NAME] ?? "",
      compiled,
    );
    const render = (tex: string, display: boolean) => {
      try {
        return katex.renderToString(tex, {
          displayMode: display,
          throwOnError: true,
          strict: false,
          trust: false,
        });
      } catch (err) {
        mathErrors.push({
          level: "error",
          line: 0,
          message: `Math error in "${tex.slice(0, 40)}${tex.length > 40 ? "…" : ""}": ${(
            err as Error
          ).message.replace(/^KaTeX parse error:\s*/, "")}`,
        });
        return `<span class="ovl-matherr">${escapeHtml(tex)}</span>`;
      }
    };
    return {
      doc: compiledDoc,
      html: emitPreviewHtml(compiledDoc, { renderMath: render }),
      mathErrors,
    };
  }, [compiled]);

  const diagnostics = useMemo(
    () => [...doc.diagnostics, ...mathErrors],
    [doc.diagnostics, mathErrors],
  );
  const errorCount = diagnostics.filter((d) => d.level === "error").length;
  const warningCount = diagnostics.filter((d) => d.level === "warning").length;
  const stale = autoCompile ? false : JSON.stringify(files) !== JSON.stringify(compiled);

  const bibEntries = useMemo(
    () => parseBibtex(files[BIB_FILE_NAME] ?? "").entries,
    [files],
  );

  // \title{} and \author{} belong to the document; the post inherits them
  // unless the author overrides the title in the menu panel.
  const docTitle = doc.meta.title?.trim() ?? "";
  const effectiveTitle = meta.title.trim() || docTitle;
  const effectiveSlug =
    slug.trim() ||
    effectiveTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

  /* —— editing ——————————————————————————————————————————————— */

  const update = useCallback((name: string, value: string) => {
    setFiles((prev) => ({ ...prev, [name]: value }));
    setSaveState("dirty");
  }, []);

  /** Append a snippet just before \end{document}. */
  const appendToBody = useCallback(
    (text: string) => {
      const src = files[MAIN_TEX_NAME] ?? "";
      const at = src.lastIndexOf("\\end{document}");
      const next =
        at === -1
          ? `${src.trimEnd()}\n\n${text}`
          : `${src.slice(0, at)}${text}\n${src.slice(at)}`;
      update(MAIN_TEX_NAME, next);
    },
    [files, update],
  );

  const insert = useCallback(
    (text: string, caretOffset?: number) => {
      if (mode === "visual") {
        if (!visualApi.current?.insert(text, caretOffset)) appendToBody(text);
        return;
      }
      const el = textareaRef.current;
      if (!el) return;
      const { selectionStart: start, selectionEnd: end, value } = el;
      const next = value.slice(0, start) + text + value.slice(end);
      update(active, next);
      const caret = start + (caretOffset ?? text.length);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(caret, caret);
      });
    },
    [active, appendToBody, mode, update],
  );

  const wrapSelection = useCallback(
    (before: string, after: string) => {
      if (mode === "visual") {
        const selected = visualApi.current?.selection() ?? "";
        insert(`${before}${selected}${after}`, selected ? undefined : before.length);
        return;
      }
      const el = textareaRef.current;
      if (!el) return;
      const { selectionStart: start, selectionEnd: end, value } = el;
      const selected = value.slice(start, end);
      const next = value.slice(0, start) + before + selected + after + value.slice(end);
      update(active, next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(
          start + before.length,
          start + before.length + selected.length,
        );
      });
    },
    [active, insert, mode, update],
  );

  /** Wrap the selection in a statement box, or drop an empty one at the caret. */
  const insertBox = useCallback(
    (kind: BoxKind) => {
      const selected =
        mode === "visual"
          ? (visualApi.current?.selection() ?? "")
          : (() => {
              const el = textareaRef.current;
              return el ? el.value.slice(el.selectionStart, el.selectionEnd) : "";
            })();
      const { text, caret } = boxSnippet(kind, selected);
      insert(text, caret);
    },
    [insert, mode],
  );

  /* —— saving ——————————————————————————————————————————————— */

  const save = useCallback(
    async (mode: "sources" | "draft" | "publish") => {
      if (mode !== "sources" && !effectiveTitle) {
        setMessage(
          "This document has no title. Add \\title{…} in main.tex, or a title in the Menu panel.",
        );
        setSaveState("error");
        setMenuOpen(true);
        return;
      }
      if (!effectiveSlug) {
        setMessage("Add a slug in the Menu panel.");
        setSaveState("error");
        setMenuOpen(true);
        return;
      }
      setSaveState("saving");
      setIssues([]);
      const res = await adminFetch("/admin/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveLatex",
          kind: target.kind,
          slug: effectiveSlug,
          previousSlug: target.slug,
          sourcesOnly: mode === "sources",
          files,
          frontmatter: frontmatterFor(
            target.kind,
            { ...meta, title: effectiveTitle },
            doc,
          ),
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        path?: string;
        issues?: { field: string; message: string }[];
      };
      if (!res.ok) {
        setSaveState("error");
        setIssues(json.issues ?? []);
        setMessage(json.error ?? "Could not save.");
        return;
      }
      setSaveState("saved");
      setMessage(
        mode === "sources"
          ? "All changes saved"
          : `Saved → ${json.path} (draft: ${meta.draft ? "yes" : "no"})`,
      );
      if (mode !== "sources") onSaved(`Saved ${json.path}`);
    },
    [doc, effectiveSlug, effectiveTitle, files, meta, onSaved, target.kind, target.slug],
  );

  // Overleaf-style autosave of the sources; the post itself is saved explicitly.
  useEffect(() => {
    if (saveState !== "dirty" || !effectiveSlug) return;
    const id = setTimeout(() => void save("sources"), 1600);
    return () => clearTimeout(id);
  }, [effectiveSlug, files, saveState, save]);

  /* —— keyboard ————————————————————————————————————————————— */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.altKey) {
        // Match on e.code: ⌥ rewrites e.key to a dead key on macOS.
        const box = BOX_KINDS.find((b) => b.code === e.code);
        if (box) {
          e.preventDefault();
          insertBox(box);
        }
        return;
      }
      if (e.key === "s") {
        e.preventDefault();
        void save("draft");
      } else if (e.key === "Enter") {
        e.preventDefault();
        recompile();
      } else if (e.key === "b") {
        e.preventDefault();
        wrapSelection("\\textbf{", "}");
      } else if (e.key === "i") {
        e.preventDefault();
        wrapSelection("\\emph{", "}");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [insertBox, recompile, save, wrapSelection]);

  const syncScroll = () => {
    const el = textareaRef.current;
    if (!el) return;
    if (gutterRef.current) gutterRef.current.scrollTop = el.scrollTop;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = el.scrollTop;
      highlightRef.current.scrollLeft = el.scrollLeft;
    }
  };

  /** Jump the caret to a log line, the way clicking an Overleaf log entry does. */
  const goToLine = (line: number) => {
    const el = textareaRef.current;
    if (!el || line <= 0) return;
    setActive(MAIN_TEX_NAME);
    requestAnimationFrame(() => {
      const lines = (files[MAIN_TEX_NAME] ?? "").split("\n");
      const start = lines.slice(0, line - 1).join("\n").length + (line > 1 ? 1 : 0);
      const end = start + (lines[line - 1]?.length ?? 0);
      el.focus();
      el.setSelectionRange(start, end);
      el.scrollTop = Math.max(0, (line - 6) * 20);
      syncScroll();
    });
  };

  /* —— drag the splitter ——————————————————————————————————— */

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    const shell = shellRef.current;
    if (!shell) return;
    const move = (ev: PointerEvent) => {
      const box = shell.getBoundingClientRect();
      const ratio = (ev.clientX - box.left - 220) / (box.width - 220);
      setSplit(Math.min(0.85, Math.max(0.15, ratio)));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const lineCount = source.split("\n").length;
  const statusLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "All changes saved"
        : saveState === "error"
          ? "Not saved"
          : dirty
            ? "Unsaved changes"
            : "All changes saved";

  return (
    <div className="ovl" ref={shellRef}>
      {/* ——— toolbar ——— */}
      <header className="ovl-bar">
        <button
          type="button"
          className="ovl-menu-btn"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
        >
          <span aria-hidden>☰</span> Menu
        </button>
        <button type="button" className="ovl-back" onClick={onExit}>
          ← Library
        </button>
        <div className="ovl-modes" role="group" aria-label="Editor mode">
          {(["code", "visual"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={mode === m ? "is-on" : ""}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              {m === "code" ? "Code" : "Visual"}
            </button>
          ))}
        </div>
        <span className="ovl-project">
          {effectiveTitle || "Untitled document"}
          <span className="ovl-project-kind">
            {target.kind === "problem" ? "problem" : "post"}
          </span>
        </span>

        <div className="ovl-bar-right">
          <span className={`ovl-savestate${saveState === "error" ? " is-error" : ""}`}>
            {statusLabel}
          </span>
          <div className="ovl-recompile">
            <button
              type="button"
              className={`ovl-green${stale ? " is-stale" : ""}`}
              onClick={recompile}
            >
              <span aria-hidden>↻</span> Recompile
            </button>
            <label className="ovl-auto">
              <input
                type="checkbox"
                checked={autoCompile}
                onChange={(e) => setAutoCompile(e.target.checked)}
              />
              Auto
            </label>
          </div>
          <button type="button" className="ovl-btn" onClick={() => void save("draft")}>
            Save draft
          </button>
        </div>
      </header>

      {/* ——— menu drawer: everything the post needs beyond its source ——— */}
      {menuOpen ? (
        <MenuDrawer
          target={target}
          meta={meta}
          setMeta={setMeta}
          slug={slug}
          setSlug={setSlug}
          docTitle={docTitle}
          effectiveSlug={effectiveSlug}
          doc={doc}
          issues={issues}
          onClose={() => setMenuOpen(false)}
          onSave={(mode) => void save(mode)}
          files={files}
          onUpdateFile={update}
        />
      ) : null}

      <div className="ovl-body">
        {/* ——— file tree ——— */}
        <FileTree
          files={files}
          active={active}
          onSelect={setActive}
          onAdd={(name) => {
            setFiles((prev) => ({ ...prev, [name]: "" }));
            setActive(name);
            setSaveState("dirty");
          }}
          onDelete={(name) => {
            setFiles((prev) => {
              const next = { ...prev };
              delete next[name];
              return next;
            });
            if (active === name) setActive(MAIN_TEX_NAME);
            setSaveState("dirty");
            void adminFetch("/admin/api", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "deleteLatexFile", slug, file: name }),
            });
          }}
        />

        {/* ——— editor ——— */}
        <section
          className="ovl-editor"
          style={{ flexBasis: `calc((100% - 226px) * ${split})` }}
          aria-label="LaTeX source"
        >
          <EditorToolbar
            onInsert={insert}
            onWrap={wrapSelection}
            onBox={insertBox}
            active={active}
            bibKeys={bibEntries.map((e) => e.key)}
          />
          {mode === "visual" && active === MAIN_TEX_NAME ? (
            <VisualEditor
              doc={doc}
              source={files[MAIN_TEX_NAME] ?? ""}
              renderMath={renderMath}
              onChangeSource={(next) => update(MAIN_TEX_NAME, next)}
              apiRef={visualApi}
            />
          ) : (
            <div className="ovl-code">
              <div className="ovl-gutter" ref={gutterRef} aria-hidden>
                {Array.from({ length: lineCount }, (_, i) => (
                  <span key={i}>{i + 1}</span>
                ))}
              </div>
              <div className="ovl-code-scroll">
                <pre
                  className="ovl-highlight"
                  ref={highlightRef}
                  aria-hidden
                  dangerouslySetInnerHTML={{ __html: highlightTex(source) }}
                />
                <textarea
                  ref={textareaRef}
                  className="ovl-textarea"
                  value={source}
                  spellCheck={false}
                  aria-label={`${active} source`}
                  onScroll={syncScroll}
                  onChange={(e) => update(active, e.target.value)}
                  onKeyDown={(e) => handleEditorKeys(e, active, update)}
                />
              </div>
            </div>
          )}
          {mode === "code" ? (
            <Autocomplete
              source={source}
              textarea={textareaRef}
              bibKeys={bibEntries.map((e) => e.key)}
              labels={Object.keys(doc.labels)}
              onPick={(completion, replaceFrom) => {
                const el = textareaRef.current;
                if (!el) return;
                const caret = el.selectionStart;
                const next =
                  source.slice(0, replaceFrom) + completion + source.slice(caret);
                update(active, next);
                const at = replaceFrom + completion.length;
                requestAnimationFrame(() => {
                  el.focus();
                  el.setSelectionRange(at, at);
                });
              }}
            />
          ) : null}
          <SymbolPalette onInsert={insert} />
        </section>

        <div
          className="ovl-splitter"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize editor and preview"
          tabIndex={0}
          onPointerDown={startDrag}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setSplit((s) => Math.max(0.15, s - 0.05));
            if (e.key === "ArrowRight") setSplit((s) => Math.min(0.85, s + 0.05));
          }}
        />

        {/* ——— output ——— */}
        <section className="ovl-preview" aria-label="Compiled output">
          <div className="ovl-preview-bar">
            <span className={`ovl-status ${errorCount ? "is-error" : "is-ok"}`}>
              {errorCount > 0
                ? `${errorCount} error${errorCount === 1 ? "" : "s"}`
                : "This project compiled successfully"}
            </span>
            <button
              type="button"
              className="ovl-btn ovl-btn-sm"
              onClick={() => setLogOpen((v) => !v)}
              aria-expanded={logOpen}
            >
              Logs {warningCount + errorCount > 0 ? `(${warningCount + errorCount})` : ""}
            </button>
            <span className="ovl-spacer" />
            <button
              type="button"
              className="ovl-icon"
              aria-label="Zoom out"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
            >
              −
            </button>
            <span className="ovl-zoom">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="ovl-icon"
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(1.8, z + 0.1))}
            >
              +
            </button>
          </div>

          {logOpen ? <LogPanel diagnostics={diagnostics} onGoToLine={goToLine} /> : null}

          <div className="ovl-pdf">
            {/* Generated by emitPreviewHtml: every text node is escaped and
                every href sanitised there, so no author input reaches the DOM
                as markup. */}
            <article
              className="ovl-page"
              style={{ fontSize: `${zoom * 11}pt` }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </section>
      </div>

      {message ? (
        <div
          className={`ovl-toast${saveState === "error" ? " is-error" : ""}`}
          role="status"
        >
          {message}
          {issues.length > 0 ? (
            <ul>
              {issues.map((i) => (
                <li key={i.field}>
                  <strong>{i.field}</strong>: {i.message}
                </li>
              ))}
            </ul>
          ) : null}
          <button type="button" onClick={() => setMessage(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ————————————————————————————————————————————————————————————————
   Frontmatter assembled from the menu panel plus the compiled document
   ———————————————————————————————————————————————————————————————— */

function frontmatterFor(
  kind: LatexTarget["kind"],
  meta: LatexTarget["meta"],
  doc: ReturnType<typeof compileLatex>,
): Record<string, unknown> {
  const abstract = doc.meta.abstract ? plainText(doc.meta.abstract).trim() : "";
  const common = {
    title: meta.title.trim(),
    date: meta.date,
    tags: meta.tags,
    draft: meta.draft,
  };
  if (kind === "problem") {
    return {
      ...common,
      prompt: meta.prompt.trim() || abstract,
      topic: meta.topic.trim(),
      difficulty: meta.difficulty,
      ...(meta.source.trim() ? { source: meta.source.trim() } : {}),
    };
  }
  return {
    ...common,
    description: meta.description.trim() || abstract,
    type: meta.type,
    domains: meta.domains,
  };
}

/* ————————————————————————————————————————————————————————————————
   Editor key handling — indentation, auto-close, environment completion
   ———————————————————————————————————————————————————————————————— */

const PAIRS: Record<string, string> = { "{": "}", "[": "]", $: "$" };

function handleEditorKeys(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  active: string,
  update: (name: string, value: string) => void,
) {
  const el = e.currentTarget;
  const { selectionStart: start, selectionEnd: end, value } = el;

  const apply = (next: string, caret: number, caretEnd = caret) => {
    e.preventDefault();
    update(active, next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caretEnd);
    });
  };

  if (e.key === "Tab") {
    if (start !== end) {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const block = value.slice(lineStart, end);
      const shifted = e.shiftKey
        ? block.replace(/^ {1,2}/gm, "")
        : block.replace(/^/gm, "  ");
      apply(
        value.slice(0, lineStart) + shifted + value.slice(end),
        lineStart,
        lineStart + shifted.length,
      );
      return;
    }
    apply(value.slice(0, start) + "  " + value.slice(end), start + 2);
    return;
  }

  if (e.key === "Enter") {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const line = value.slice(lineStart, start);
    const indent = /^\s*/.exec(line)?.[0] ?? "";
    const begin = /\\begin\{([^}]+)\}\s*(\[[^\]]*\])?\s*$/.exec(line);
    if (begin) {
      const env = begin[1] ?? "";
      const block = `\n${indent}  \n${indent}\\end{${env}}`;
      apply(value.slice(0, start) + block + value.slice(end), start + indent.length + 3);
      return;
    }
    if (/^\s*\\item\b/.test(line) && line.trim() !== "\\item") {
      apply(
        value.slice(0, start) + `\n${indent}\\item ` + value.slice(end),
        start + indent.length + 7,
      );
      return;
    }
    if (indent) {
      apply(
        value.slice(0, start) + "\n" + indent + value.slice(end),
        start + 1 + indent.length,
      );
    }
    return;
  }

  const closer = PAIRS[e.key];
  if (closer) {
    // Wrap a selection rather than replacing it.
    if (start !== end) {
      const selected = value.slice(start, end);
      apply(
        value.slice(0, start) + e.key + selected + closer + value.slice(end),
        start + 1,
        end + 1,
      );
      return;
    }
    if (e.key === "$" && value[start] === "$") return;
    apply(value.slice(0, start) + e.key + closer + value.slice(end), start + 1);
    return;
  }

  // Typing the closing brace right before one just skips over it.
  if ((e.key === "}" || e.key === "]") && value[start] === e.key && start === end) {
    e.preventDefault();
    el.setSelectionRange(start + 1, start + 1);
  }
}

/* ————————————————————————————————————————————————————————————————
   File tree
   ———————————————————————————————————————————————————————————————— */

function FileTree({
  files,
  active,
  onSelect,
  onAdd,
  onDelete,
}: {
  files: Record<string, string>;
  active: string;
  onSelect: (name: string) => void;
  onAdd: (name: string) => void;
  onDelete: (name: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const names = Object.keys(files).sort((a, b) =>
    a === MAIN_TEX_NAME ? -1 : b === MAIN_TEX_NAME ? 1 : a.localeCompare(b),
  );

  return (
    <nav className="ovl-files" aria-label="Project files">
      <div className="ovl-files-head">
        <span>Project</span>
        <button
          type="button"
          className="ovl-icon"
          aria-label="New file"
          title="New file"
          onClick={() => setAdding(true)}
        >
          +
        </button>
      </div>
      <ul>
        {names.map((f) => (
          <li key={f}>
            <button
              type="button"
              className={`ovl-file${f === active ? " is-active" : ""}`}
              onClick={() => onSelect(f)}
              aria-current={f === active ? "true" : undefined}
            >
              <span className="ovl-file-icon" aria-hidden>
                {f.endsWith(".bib") ? "❝" : "§"}
              </span>
              {f}
            </button>
            {f !== MAIN_TEX_NAME && f !== BIB_FILE_NAME ? (
              <button
                type="button"
                className="ovl-file-del"
                aria-label={`Delete ${f}`}
                onClick={() => onDelete(f)}
              >
                ×
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {adding ? (
        <form
          className="ovl-newfile"
          onSubmit={(e) => {
            e.preventDefault();
            const clean = name.trim();
            if (!clean) return;
            onAdd(/\.(tex|bib|sty|txt)$/.test(clean) ? clean : `${clean}.tex`);
            setName("");
            setAdding(false);
          }}
        >
          <label className="ovl-sr" htmlFor="ovl-newfile">
            New file name
          </label>
          <input
            id="ovl-newfile"
            value={name}
            autoFocus
            placeholder="sections/intro.tex"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => !name && setAdding(false)}
          />
          <button type="submit" className="ovl-btn ovl-btn-sm">
            Create
          </button>
        </form>
      ) : null}
      <p className="ovl-files-hint">
        Include a file with <code>\input{"{name}"}</code>.
      </p>
    </nav>
  );
}

/* ————————————————————————————————————————————————————————————————
   Editor toolbar
   ———————————————————————————————————————————————————————————————— */

function EditorToolbar({
  onInsert,
  onWrap,
  onBox,
  active,
  bibKeys,
}: {
  onInsert: (text: string, caretOffset?: number) => void;
  onWrap: (before: string, after: string) => void;
  onBox: (kind: BoxKind) => void;
  active: string;
  bibKeys: string[];
}) {
  if (active.endsWith(".bib")) {
    return (
      <div className="ovl-toolbar">
        <span className="ovl-toolbar-note">
          BibTeX — {bibKeys.length} entr{bibKeys.length === 1 ? "y" : "ies"}. Cite them in
          main.tex with <code>\cite{"{key}"}</code>.
        </span>
      </div>
    );
  }
  return (
    <div className="ovl-toolbar">
      <div className="ovl-toolbar-row">
        <button type="button" onClick={() => onWrap("\\textbf{", "}")} title="Bold (⌘B)">
          <strong>B</strong>
        </button>
        <button type="button" onClick={() => onWrap("\\emph{", "}")} title="Italic (⌘I)">
          <em>I</em>
        </button>
        <button type="button" onClick={() => onWrap("\\texttt{", "}")} title="Monospace">
          <code>M</code>
        </button>
        <span className="ovl-toolbar-sep" />
        <button type="button" onClick={() => onWrap("$", "$")} title="Inline math">
          $x$
        </button>
        <button
          type="button"
          onClick={() => onInsert("\\[\n  \n\\]\n", 5)}
          title="Display math"
        >
          $$
        </button>
        <details className="ovl-insert">
          <summary title="Insert a structure">Insert ▾</summary>
          <div className="ovl-insert-menu">
            {SNIPPETS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={(e) => {
                  onInsert(s.insert, s.insert.indexOf("{}") + 1 || undefined);
                  e.currentTarget.closest("details")?.removeAttribute("open");
                }}
              >
                <span>{s.label}</span>
                <span className="ovl-insert-hint">{s.hint}</span>
              </button>
            ))}
          </div>
        </details>
      </div>

      <div className="ovl-toolbar-row ovl-toolbar-boxes">
        <span className="ovl-toolbar-note">Boxes</span>
        {BOX_KINDS.map((kind) => (
          <button
            key={kind.env}
            type="button"
            className={`ovl-boxbtn ovl-box-${kind.env}`}
            title={`${kind.label} box — ⌘⌥${kind.keys} (wraps the selection)`}
            onClick={() => onBox(kind)}
          >
            {kind.glyph ? <span aria-hidden>{kind.glyph} </span> : null}
            {kind.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ————————————————————————————————————————————————————————————————
   Symbol palette
   ———————————————————————————————————————————————————————————————— */

function SymbolPalette({ onInsert }: { onInsert: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState(SYMBOL_GROUPS[0]?.label ?? "Greek");
  const current = SYMBOL_GROUPS.find((g) => g.label === group) ?? SYMBOL_GROUPS[0];

  return (
    <div className="ovl-palette">
      <button
        type="button"
        className="ovl-palette-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span aria-hidden>Ω</span> Symbol palette
      </button>
      {open && current ? (
        <div className="ovl-palette-body">
          <div className="ovl-palette-tabs" role="tablist" aria-label="Symbol groups">
            {SYMBOL_GROUPS.map((g) => (
              <button
                key={g.label}
                type="button"
                role="tab"
                aria-selected={g.label === group}
                onClick={() => setGroup(g.label)}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="ovl-palette-grid">
            {current.symbols.map(([glyph, tex]) => (
              <button
                key={tex}
                type="button"
                title={tex}
                onClick={() => onInsert(tex)}
                aria-label={`Insert ${tex}`}
              >
                {glyph}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ————————————————————————————————————————————————————————————————
   \cite{…} and \ref{…} completion
   ———————————————————————————————————————————————————————————————— */

function Autocomplete({
  source,
  textarea,
  bibKeys,
  labels,
  onPick,
}: {
  source: string;
  textarea: React.RefObject<HTMLTextAreaElement | null>;
  bibKeys: string[];
  labels: string[];
  onPick: (completion: string, replaceFrom: number) => void;
}) {
  const [state, setState] = useState<{
    kind: "cite" | "ref";
    partial: string;
    from: number;
  } | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    const check = () => {
      const caret = el.selectionStart;
      const before = source.slice(0, caret);
      const m = /\\(cite|citep|citet|ref|eqref|autoref)\{([^}\n]*)$/.exec(before);
      if (!m) {
        setState(null);
        return;
      }
      const partial = m[2] ?? "";
      setState({
        kind: (m[1] ?? "cite").startsWith("cite") ? "cite" : "ref",
        partial,
        from: caret - partial.length,
      });
      setIndex(0);
    };
    const dismiss = () => setTimeout(() => setState(null), 150);
    el.addEventListener("keyup", check);
    el.addEventListener("click", check);
    el.addEventListener("blur", dismiss);
    return () => {
      el.removeEventListener("keyup", check);
      el.removeEventListener("click", check);
      el.removeEventListener("blur", dismiss);
    };
  }, [source, textarea]);

  const options = useMemo(() => {
    if (!state) return [];
    const pool = state.kind === "cite" ? bibKeys : labels;
    return pool
      .filter((k) => k.toLowerCase().includes(state.partial.toLowerCase()))
      .slice(0, 8);
  }, [state, bibKeys, labels]);

  useEffect(() => {
    const el = textarea.current;
    if (!el || !state || options.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => (i + 1) % options.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => (i - 1 + options.length) % options.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        const choice = options[index];
        if (!choice) return;
        e.preventDefault();
        onPick(choice, state.from);
        setState(null);
      } else if (e.key === "Escape") {
        setState(null);
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [state, options, index, onPick, textarea]);

  if (!state || options.length === 0) return null;

  return (
    <div className="ovl-complete" role="listbox" aria-label="Completions">
      <p className="ovl-complete-head">
        {state.kind === "cite" ? "Citation keys" : "Labels"} · ↑↓ to choose, ⏎ to insert
      </p>
      {options.map((option, i) => (
        <button
          key={option}
          type="button"
          role="option"
          aria-selected={i === index}
          className={i === index ? "is-active" : ""}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(option, state.from);
            setState(null);
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/* ————————————————————————————————————————————————————————————————
   Compile log
   ———————————————————————————————————————————————————————————————— */

function LogPanel({
  diagnostics,
  onGoToLine,
}: {
  diagnostics: Diagnostic[];
  onGoToLine: (line: number) => void;
}) {
  if (diagnostics.length === 0) {
    return (
      <div className="ovl-log">
        <p className="ovl-log-empty">No errors, warnings or notes.</p>
      </div>
    );
  }
  return (
    <div className="ovl-log">
      <ul>
        {diagnostics.map((d, i) => (
          <li key={i} className={`ovl-log-${d.level}`}>
            <span className="ovl-log-tag">{d.level}</span>
            {d.line > 0 ? (
              <button
                type="button"
                className="ovl-log-line"
                onClick={() => onGoToLine(d.line)}
              >
                line {d.line}
              </button>
            ) : null}
            <span>{d.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ————————————————————————————————————————————————————————————————
   Menu drawer — post settings, references, word count, actions
   ———————————————————————————————————————————————————————————————— */

function MenuDrawer({
  target,
  meta,
  setMeta,
  slug,
  setSlug,
  docTitle,
  effectiveSlug,
  doc,
  issues,
  files,
  onClose,
  onSave,
  onUpdateFile,
}: {
  target: LatexTarget;
  meta: LatexTarget["meta"];
  setMeta: (m: LatexTarget["meta"]) => void;
  slug: string;
  setSlug: (s: string) => void;
  docTitle: string;
  effectiveSlug: string;
  doc: ReturnType<typeof compileLatex>;
  issues: { field: string; message: string }[];
  files: Record<string, string>;
  onClose: () => void;
  onSave: (mode: "sources" | "draft" | "publish") => void;
  onUpdateFile: (name: string, value: string) => void;
}) {
  const abstract = doc.meta.abstract ? plainText(doc.meta.abstract).trim() : "";
  const refs = bibliographyFor(doc);
  const issueFor = (field: string) => issues.find((i) => i.field === field)?.message;

  const download = () => {
    const blob = new Blob([files[MAIN_TEX_NAME] ?? ""], { type: "text/x-tex" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug || "document"}.tex`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ovl-drawer" role="dialog" aria-label="Project menu">
      <div className="ovl-drawer-head">
        <span>Menu</span>
        <button
          type="button"
          className="ovl-icon"
          aria-label="Close menu"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="ovl-drawer-body">
        <section>
          <h3>Post settings</h3>
          <label className="ovl-field">
            <span>Title</span>
            <input
              value={meta.title}
              placeholder={docTitle || "Set \\title{…} in main.tex"}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            />
          </label>
          <p className="ovl-hint" style={{ marginTop: -4 }}>
            {docTitle
              ? `Taken from \\title{} in main.tex${meta.title.trim() ? " (overridden here)" : ""}.`
              : "Add \\title{…} to main.tex and it appears here."}
          </p>
          {issueFor("title") ? <p className="ovl-issue">{issueFor("title")}</p> : null}

          <label className="ovl-field">
            <span>Slug</span>
            <input
              value={slug}
              placeholder={effectiveSlug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </label>
          {issueFor("slug") ? <p className="ovl-issue">{issueFor("slug")}</p> : null}

          <label className="ovl-field">
            <span>Date</span>
            <input
              type="date"
              value={meta.date}
              onChange={(e) => setMeta({ ...meta, date: e.target.value })}
            />
          </label>

          {target.kind === "note" ? (
            <>
              <label className="ovl-field">
                <span>Description</span>
                <textarea
                  rows={2}
                  value={meta.description}
                  placeholder={abstract || "Taken from \\begin{abstract} when left empty"}
                  onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                />
              </label>
              {issueFor("description") ? (
                <p className="ovl-issue">{issueFor("description")}</p>
              ) : null}
              <label className="ovl-field">
                <span>Type</span>
                <select
                  value={meta.type}
                  onChange={(e) => setMeta({ ...meta, type: e.target.value })}
                >
                  {NOTE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="ovl-field">
                <legend>Domains</legend>
                <div className="ovl-checks">
                  {DOMAINS.map((d) => (
                    <label key={d}>
                      <input
                        type="checkbox"
                        checked={meta.domains.includes(d)}
                        onChange={(e) =>
                          setMeta({
                            ...meta,
                            domains: e.target.checked
                              ? [...meta.domains, d]
                              : meta.domains.filter((x) => x !== d),
                          })
                        }
                      />
                      {domainLabels[d]}
                    </label>
                  ))}
                </div>
              </fieldset>
              {issueFor("domains") ? (
                <p className="ovl-issue">{issueFor("domains")}</p>
              ) : null}
            </>
          ) : (
            <>
              <label className="ovl-field">
                <span>Question</span>
                <textarea
                  rows={3}
                  value={meta.prompt}
                  placeholder={abstract || "Taken from \\begin{abstract} when left empty"}
                  onChange={(e) => setMeta({ ...meta, prompt: e.target.value })}
                />
              </label>
              {issueFor("prompt") ? (
                <p className="ovl-issue">{issueFor("prompt")}</p>
              ) : null}
              <label className="ovl-field">
                <span>Topic</span>
                <input
                  value={meta.topic}
                  onChange={(e) => setMeta({ ...meta, topic: e.target.value })}
                />
              </label>
              {issueFor("topic") ? (
                <p className="ovl-issue">{issueFor("topic")}</p>
              ) : null}
              <label className="ovl-field">
                <span>Difficulty</span>
                <select
                  value={meta.difficulty}
                  onChange={(e) => setMeta({ ...meta, difficulty: e.target.value })}
                >
                  {PROBLEM_DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ovl-field">
                <span>Source</span>
                <input
                  value={meta.source}
                  placeholder="Optional — where the problem came from"
                  onChange={(e) => setMeta({ ...meta, source: e.target.value })}
                />
              </label>
            </>
          )}

          <label className="ovl-field">
            <span>Tags</span>
            <input
              value={meta.tags.join(", ")}
              placeholder="comma separated"
              onChange={(e) =>
                setMeta({
                  ...meta,
                  tags: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>

          <label className="ovl-check">
            <input
              type="checkbox"
              checked={meta.draft}
              onChange={(e) => setMeta({ ...meta, draft: e.target.checked })}
            />
            Keep as a draft (hidden in production)
          </label>
        </section>

        <ReferenceManager files={files} doc={doc} onUpdateFile={onUpdateFile} />

        <section>
          <h3>Word count</h3>
          <dl className="ovl-stats">
            <div>
              <dt>Words</dt>
              <dd>{doc.stats.words}</dd>
            </div>
            <div>
              <dt>Equations</dt>
              <dd>{doc.stats.equations}</dd>
            </div>
            <div>
              <dt>Statements</dt>
              <dd>{doc.stats.theorems}</dd>
            </div>
            <div>
              <dt>Citations</dt>
              <dd>{refs.length}</dd>
            </div>
            <div>
              <dt>Footnotes</dt>
              <dd>{doc.stats.footnotes}</dd>
            </div>
            <div>
              <dt>Figures</dt>
              <dd>{doc.stats.figures}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h3>Actions</h3>
          <div className="ovl-actions">
            <button type="button" className="ovl-btn" onClick={() => onSave("draft")}>
              Save draft
            </button>
            <button
              type="button"
              className="ovl-btn ovl-btn-primary"
              onClick={() => {
                setMeta({ ...meta, draft: false });
                onSave("publish");
              }}
            >
              Publish
            </button>
            <button type="button" className="ovl-btn" onClick={download}>
              Download .tex
            </button>
            <button
              type="button"
              className="ovl-btn"
              onClick={() => void navigator.clipboard.writeText(emitMdx(doc))}
            >
              Copy MDX
            </button>
          </div>
          <p className="ovl-path">
            Sources: <code>content/latex/{slug || "…"}/</code>
            <br />
            Post:{" "}
            <code>
              content/{target.kind === "problem" ? "problems" : "notes"}/{slug || "…"}.mdx
            </code>
          </p>
        </section>
      </div>
    </div>
  );
}

/* ————————————————————————————————————————————————————————————————
   Reference manager — the bibliography without hand-writing BibTeX
   ———————————————————————————————————————————————————————————————— */

function ReferenceManager({
  files,
  doc,
  onUpdateFile,
}: {
  files: Record<string, string>;
  doc: ReturnType<typeof compileLatex>;
  onUpdateFile: (name: string, value: string) => void;
}) {
  const entries = useMemo(() => parseBibtex(files[BIB_FILE_NAME] ?? "").entries, [files]);
  const cited = new Set(doc.citations.map((c) => c.key));
  const [draft, setDraft] = useState({
    type: "article",
    author: "",
    title: "",
    year: "",
    venue: "",
    url: "",
  });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const key =
      suggestCiteKey(draft.author, draft.year, draft.title) || `ref${entries.length + 1}`;
    const fields: Record<string, string> = {
      author: draft.author,
      title: draft.title,
      year: draft.year,
      url: draft.url,
    };
    if (draft.venue)
      fields[draft.type === "book" ? "publisher" : "journal"] = draft.venue;
    const bibtex = toBibtex({ key, type: draft.type, fields });
    const current = files[BIB_FILE_NAME] ?? "";
    onUpdateFile(BIB_FILE_NAME, `${current.trimEnd()}\n\n${bibtex}\n`.trimStart());
    setDraft({ type: "article", author: "", title: "", year: "", venue: "", url: "" });
  };
  return (
    <section>
      <h3>References</h3>
      {entries.length === 0 ? (
        <p className="ovl-hint">
          No entries yet. Open <code>references.bib</code> and paste BibTeX, or add one
          below.
        </p>
      ) : (
        <ul className="ovl-refs">
          {entries.map((e) => (
            <li key={e.key}>
              <code>{e.key}</code>
              <span className={cited.has(e.key) ? "ovl-tag is-cited" : "ovl-tag"}>
                {cited.has(e.key)
                  ? `cited [${doc.citations.find((c) => c.key === e.key)?.n}]`
                  : "not cited"}
              </span>
              <span className="ovl-ref-title">{e.fields.title ?? ""}</span>
            </li>
          ))}
        </ul>
      )}
      <form className="ovl-addref" onSubmit={add}>
        <p className="ovl-addref-head">Add a reference</p>
        <label className="ovl-field">
          <span>Type</span>
          <select
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value })}
          >
            {["article", "book", "inproceedings", "misc"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="ovl-field">
          <span>Author(s)</span>
          <input
            value={draft.author}
            placeholder="Last, First and Last, First"
            onChange={(e) => setDraft({ ...draft, author: e.target.value })}
          />
        </label>
        <label className="ovl-field">
          <span>Title</span>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>
        <label className="ovl-field">
          <span>Year</span>
          <input
            value={draft.year}
            inputMode="numeric"
            onChange={(e) => setDraft({ ...draft, year: e.target.value })}
          />
        </label>
        <label className="ovl-field">
          <span>{draft.type === "book" ? "Publisher" : "Journal / venue"}</span>
          <input
            value={draft.venue}
            onChange={(e) => setDraft({ ...draft, venue: e.target.value })}
          />
        </label>
        <label className="ovl-field">
          <span>URL or DOI</span>
          <input
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          />
        </label>
        <button type="submit" className="ovl-btn ovl-btn-sm">
          Append to references.bib
        </button>
      </form>
      <p className="ovl-hint">
        Only cited entries are written to the post&rsquo;s <code>bibliography</code>{" "}
        frontmatter, so the published References list matches the text.
      </p>
    </section>
  );
}

/* ————————————————————————————————————————————————————————————————
   Statement boxes — toolbar buttons and keyboard shortcuts
   ———————————————————————————————————————————————————————————————— */

export interface BoxKind {
  env: string;
  label: string;
  glyph?: string;
  /** KeyboardEvent.code, so ⌥ dead keys on macOS do not break the shortcut. */
  code: string;
  /** Shown in the button's tooltip. */
  keys: string;
  /** Environments that take an optional [title]. */
  titled: boolean;
}

export const BOX_KINDS: BoxKind[] = [
  {
    env: "keyidea",
    label: "Key idea",
    glyph: "💡",
    code: "KeyK",
    keys: "K",
    titled: false,
  },
  { env: "definition", label: "Definition", code: "KeyD", keys: "D", titled: true },
  { env: "theorem", label: "Theorem", code: "KeyT", keys: "T", titled: true },
  { env: "lemma", label: "Lemma", code: "KeyL", keys: "L", titled: true },
  { env: "corollary", label: "Corollary", code: "KeyY", keys: "Y", titled: true },
  { env: "proposition", label: "Proposition", code: "KeyO", keys: "O", titled: true },
  { env: "example", label: "Example", code: "KeyX", keys: "X", titled: false },
  { env: "remark", label: "Remark", code: "KeyR", keys: "R", titled: false },
  { env: "proof", label: "Proof", code: "KeyP", keys: "P", titled: false },
];

/** The LaTeX a box button inserts, wrapping the selection when there is one. */
export function boxSnippet(
  kind: BoxKind,
  selection = "",
): { text: string; caret: number } {
  const open = `\\begin{${kind.env}}${kind.titled ? "[]" : ""}\n  `;
  const body = selection.trim() || "";
  const text = `${open}${body}\n\\end{${kind.env}}\n`;
  // Land the caret in the title slot when there is one, else in the body.
  const caret = kind.titled && !body ? open.length - 3 : open.length + body.length;
  return { text, caret };
}

/* ————————————————————————————————————————————————————————————————
   Visual editor — the document, block by block, editable in place
   ———————————————————————————————————————————————————————————————— */

interface VisualEdit {
  /** 1-based first line of the block in main.tex. */
  from: number;
  /** How many lines the block currently occupies. */
  span: number;
  text: string;
}

export interface VisualApi {
  /** Insert at the caret of the block being edited. False when none is. */
  insert: (text: string, caretOffset?: number) => boolean;
  selection: () => string;
}

function VisualEditor({
  doc,
  source,
  renderMath,
  onChangeSource,
  apiRef,
}: {
  doc: ReturnType<typeof compileLatex>;
  source: string;
  renderMath: (tex: string, display: boolean) => string;
  onChangeSource: (next: string) => void;
  apiRef: React.RefObject<VisualApi | null>;
}) {
  const [edit, setEdit] = useState<VisualEdit | null>(null);
  const [preambleOpen, setPreambleOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const lines = useMemo(() => source.split("\n"), [source]);
  const blocks = useMemo(
    () =>
      doc.blocks.filter((b) => typeof b.from === "number" && typeof b.to === "number"),
    [doc.blocks],
  );
  const docStart = lines.findIndex((l) => l.includes("\\begin{document}"));
  const preamble = docStart === -1 ? "" : lines.slice(0, docStart).join("\n");
  const editable = doc.sourceMapExact;

  // The abstract is lifted into the post description, so it has no block of
  // its own — locate it in the source to keep it editable here.
  const abstractFrom = lines.findIndex((l) => l.includes("\\begin{abstract}")) + 1;
  const abstractTo = lines.findIndex((l) => l.includes("\\end{abstract}")) + 1;

  /** Splice the buffer back over the lines it replaced. */
  const commit = useCallback(
    (current: VisualEdit) => {
      const replacement = current.text.split("\n");
      const next = [...source.split("\n")];
      next.splice(current.from - 1, current.span, ...replacement);
      onChangeSource(next.join("\n"));
      return replacement.length;
    },
    [onChangeSource, source],
  );

  // Live commit: neighbouring blocks and the output pane update as you type.
  useEffect(() => {
    if (!edit) return;
    const id = setTimeout(() => {
      const span = commit(edit);
      setEdit((prev) => (prev && prev.from === edit.from ? { ...prev, span } : prev));
    }, 400);
    return () => clearTimeout(id);
  }, [edit, commit]);

  useEffect(() => {
    apiRef.current = {
      insert: (text, caretOffset) => {
        const el = taRef.current;
        if (!el || !edit) return false;
        const { selectionStart: start, selectionEnd: end, value } = el;
        const next = value.slice(0, start) + text + value.slice(end);
        setEdit({ ...edit, text: next });
        const caret = start + (caretOffset ?? text.length);
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(caret, caret);
        });
        return true;
      },
      selection: () => {
        const el = taRef.current;
        if (!el) return "";
        return el.value.slice(el.selectionStart, el.selectionEnd);
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, edit]);

  const open = (from: number, to: number) => {
    if (!editable) return;
    if (edit) commit(edit);
    setEdit({ from, span: to - from + 1, text: lines.slice(from - 1, to).join("\n") });
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const close = () => {
    if (edit) commit(edit);
    setEdit(null);
  };

  const removeBlock = (from: number, to: number) => {
    const next = [...lines];
    next.splice(from - 1, to - from + 1);
    onChangeSource(next.join("\n"));
    setEdit(null);
  };

  /** Insert an empty paragraph after a block and start editing it. */
  const addAfter = (afterLine: number) => {
    if (edit) commit(edit);
    const next = [...source.split("\n")];
    next.splice(afterLine, 0, "", "");
    onChangeSource(next.join("\n"));
    setEdit({ from: afterLine + 2, span: 1, text: "" });
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const lastLine = blocks.length
    ? Math.max(...blocks.map((b) => b.to ?? 0))
    : Math.max(docStart + 1, 1);

  return (
    <div className="ovl-visual">
      <div className="ovl-page ovl-visual-page">
        {!editable ? (
          <p className="ovl-visual-notice">
            This document pulls in other files with <code>\input</code>, so a block here
            no longer maps to a known line of <code>main.tex</code>. Blocks are read-only
            — switch to <strong>Code</strong> to edit.
          </p>
        ) : null}
        {preamble ? (
          <div className="ovl-preamble">
            <button
              type="button"
              className="ovl-preamble-toggle"
              aria-expanded={preambleOpen}
              onClick={() => setPreambleOpen((v) => !v)}
            >
              <span aria-hidden>{preambleOpen ? "▾" : "▸"}</span> Preamble ·{" "}
              {preamble.split("\n").length} lines
            </button>
            {preambleOpen ? (
              <>
                <label className="ovl-sr" htmlFor="ovl-preamble-src">
                  Preamble source
                </label>
                <textarea
                  id="ovl-preamble-src"
                  className="ovl-visual-src"
                  rows={Math.min(20, preamble.split("\n").length + 1)}
                  value={preamble}
                  onChange={(e) => {
                    const next = [...lines];
                    next.splice(0, docStart, ...e.target.value.split("\n"));
                    onChangeSource(next.join("\n"));
                  }}
                />
              </>
            ) : null}
          </div>
        ) : null}

        {doc.meta.title || doc.meta.author ? (
          <div
            className="ovl-titleblock"
            dangerouslySetInnerHTML={{
              __html: `${doc.meta.title ? `<h1>${doc.meta.title}</h1>` : ""}${
                doc.meta.author ? `<p class="ovl-author">${doc.meta.author}</p>` : ""
              }`,
            }}
          />
        ) : null}

        {doc.meta.abstract && abstractFrom > 0 && abstractTo >= abstractFrom ? (
          edit && edit.from === abstractFrom ? null : (
            <div className="ovl-visual-block">
              <div
                role="button"
                tabIndex={0}
                aria-label={`Edit abstract, lines ${abstractFrom} to ${abstractTo}`}
                className="ovl-visual-body ovl-abstract"
                onClick={() => open(abstractFrom, abstractTo)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open(abstractFrom, abstractTo);
                  }
                }}
              >
                <p className="ovl-abstract-head">Abstract</p>
                <div
                  dangerouslySetInnerHTML={{
                    __html: emitBlockHtml({ t: "para", c: doc.meta.abstract }, doc, {
                      renderMath,
                    }),
                  }}
                />
              </div>
            </div>
          )
        ) : null}

        {edit && edit.from === abstractFrom && abstractFrom > 0 ? (
          <BlockSource
            edit={edit}
            taRef={taRef}
            onChange={(text) => setEdit({ ...edit, text })}
            onClose={close}
          />
        ) : null}

        {blocks.length === 0 && !edit ? (
          <p className="ovl-visual-empty">
            This document has no body yet.{" "}
            <button
              type="button"
              className="ovl-log-line"
              onClick={() => addAfter(docStart + 1)}
            >
              Start writing
            </button>
          </p>
        ) : null}

        {blocks.map((block) => {
          const from = block.from ?? 0;
          const to = block.to ?? from;
          if (edit && edit.from === from) {
            return (
              <BlockSource
                key={`edit-${from}`}
                edit={edit}
                taRef={taRef}
                onChange={(text) => setEdit({ ...edit, text })}
                onClose={close}
              />
            );
          }
          return (
            <div className="ovl-visual-block" key={`b-${from}-${block.t}`}>
              <div
                role="button"
                tabIndex={0}
                aria-label={`Edit ${block.t}, lines ${from} to ${to}`}
                className="ovl-visual-body"
                onClick={() => open(from, to)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open(from, to);
                  }
                }}
                dangerouslySetInnerHTML={{
                  __html: emitBlockHtml(block, doc, { renderMath }),
                }}
              />
              {editable ? (
                <div className="ovl-visual-tools">
                  <button
                    type="button"
                    aria-label={`Insert a block after line ${to}`}
                    title="Insert a paragraph below"
                    onClick={() => addAfter(to)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${block.t} at line ${from}`}
                    title="Delete this block"
                    onClick={() => removeBlock(from, to)}
                  >
                    ×
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}

        {blocks.length > 0 && editable ? (
          <button
            type="button"
            className="ovl-visual-add"
            onClick={() => addAfter(lastLine)}
          >
            + Add a block
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** The in-place source box a visual block turns into when you click it. */
function BlockSource({
  edit,
  taRef,
  onChange,
  onClose,
}: {
  edit: VisualEdit;
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (text: string) => void;
  onClose: () => void;
}) {
  const lineCount = edit.text.split("\n").length;

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [edit.text, taRef]);

  return (
    <div className="ovl-visual-editing">
      <label className="ovl-sr" htmlFor="ovl-block-src">
        Block source, from line {edit.from}
      </label>
      <textarea
        id="ovl-block-src"
        ref={taRef}
        className="ovl-visual-src"
        rows={Math.max(2, lineCount + 1)}
        value={edit.text}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
      />
      <p className="ovl-visual-hint">
        Editing lines {edit.from}–{edit.from + lineCount - 1} · Esc to finish
      </p>
    </div>
  );
}
