"use client";

import { useId, useState } from "react";

/**
 * Inline numbered footnote disclosure. A superscript-style numbered button
 * toggles the note open beneath its anchor. (The former Tufte margin-float
 * variant was retired in the WordPress reskin, where the right margin is the
 * widget sidebar.) No hover-only or hidden-from-AT content.
 */
export function MarginNote({
  index,
  children,
}: {
  /** String because MDX attribute expressions do not survive this pipeline. */
  index?: number | string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const mark = index != null ? String(index) : "※";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center border border-rule-strong px-1 font-mono text-[0.65rem] text-annotation transition-colors duration-[var(--t-micro)] hover:border-annotation"
      >
        {mark}
      </button>
      <span
        id={id}
        hidden={!open}
        className="my-2 block border-l border-annotation pl-4 font-mono text-[0.78rem] leading-relaxed text-muted"
      >
        {children}
      </span>
    </>
  );
}
