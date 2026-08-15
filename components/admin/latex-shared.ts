/**
 * Types shared between the admin shell and the LaTeX studio. Kept separate so
 * the shell can build a target without importing the (client-only) editor.
 */

export const MAIN_TEX_NAME = "main.tex";
export const BIB_FILE_NAME = "references.bib";

/** The post fields that live outside the .tex source. */
export interface LatexMeta {
  title: string;
  date: string;
  draft: boolean;
  tags: string[];
  /** Notes. Empty falls back to the document's abstract. */
  description: string;
  type: string;
  domains: string[];
  /** Problems. Empty falls back to the document's abstract. */
  prompt: string;
  topic: string;
  difficulty: string;
  source: string;
}

export interface LatexTarget {
  kind: "note" | "problem";
  slug: string;
  meta: LatexMeta;
  files: Record<string, string>;
  isNew: boolean;
}

export function emptyLatexMeta(date: string): LatexMeta {
  return {
    title: "",
    date,
    draft: true,
    tags: [],
    description: "",
    type: "research-note",
    domains: ["mathematics"],
    prompt: "",
    topic: "",
    difficulty: "medium",
    source: "",
  };
}
