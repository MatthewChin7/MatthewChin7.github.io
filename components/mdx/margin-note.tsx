"use client";

import { useId, useState } from "react";

/**
 * On wide (xl+) screens the note floats into the true right margin beside
 * its anchor (Tufte-style sidenote: float-right + negative right margin).
 * Below xl it collapses to an inline numbered disclosure — no hover-only
 * or hidden content anywhere.
 */
export function MarginNote({
  index,
  children,
}: {
  index?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const mark = index != null ? String(index) : "※";

  return (
    <>
      {/* wide: hanging note in the margin column */}
      <span
        className="hidden font-mono text-[0.7rem] text-annotation xl:inline"
        aria-hidden
      >
        {mark}
      </span>
      <span className="clear-right float-right my-1 -mr-52 hidden w-44 border-l border-rule pl-4 font-mono text-[0.72rem] leading-relaxed text-muted [text-wrap:pretty] xl:block">
        <span className="text-annotation" aria-hidden>
          {mark}{" "}
        </span>
        {children}
      </span>
      {/* narrow: inline toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center border border-rule-strong px-1 font-mono text-[0.65rem] text-annotation transition-colors duration-[var(--t-micro)] hover:border-annotation xl:hidden"
      >
        {mark}
      </button>
      <span
        id={id}
        hidden={!open}
        className="my-2 block border-l border-annotation pl-4 font-mono text-[0.78rem] leading-relaxed text-muted xl:hidden"
      >
        {children}
      </span>
    </>
  );
}
