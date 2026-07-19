"use client";

import Link from "next/link";
import { useState } from "react";

export interface NoteRow {
  index: string;
  title: string;
  url: string;
  category: string;
  readingTime: number;
  date: string;
  series?: string;
  abstract: string;
  draft?: boolean;
}

/**
 * Journal contents: row list with an adjacent preview panel on wide
 * screens (driven by hover/focus). On narrow screens the abstract renders
 * beneath each row — no hover-only content anywhere.
 */
export function NotesContents({ rows }: { rows: NoteRow[] }) {
  const [active, setActive] = useState(0);
  const current = rows[active] ?? rows[0];

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <ol className="lg:col-span-7">
        {rows.map((row, i) => (
          <li key={row.url} className="border-b border-rule first:border-t">
            <Link
              href={row.url}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className={`group block py-4 transition-colors duration-[var(--t-micro)] ${
                active === i ? "bg-signal-soft/40" : ""
              }`}
            >
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="type-mono-meta w-8 text-faint">{row.index}</span>
                <span className="type-title flex-1 basis-52 group-hover:text-signal">
                  {row.title}
                  {row.draft ? (
                    <span className="type-mono-label ml-3 text-annotation">Draft</span>
                  ) : null}
                </span>
              </div>
              <div className="type-mono-meta mt-1.5 flex flex-wrap gap-x-4 pl-12 text-faint">
                <span>{row.category}</span>
                <span>{row.readingTime} min</span>
                <span>{row.date}</span>
                {row.series ? (
                  <span className="text-annotation">{row.series}</span>
                ) : null}
              </div>
              <p className="mt-2 pl-12 text-sm text-muted lg:hidden">{row.abstract}</p>
            </Link>
          </li>
        ))}
      </ol>
      <aside
        className="sticky top-24 hidden h-fit border-l border-rule pl-8 lg:col-span-5 lg:block"
        aria-live="polite"
      >
        {current ? (
          <>
            <p className="type-mono-label mb-3 text-faint">Abstract — {current.index}</p>
            <p className="font-serif text-xl leading-relaxed text-fg">
              {current.abstract}
            </p>
            <p className="type-mono-meta mt-4 text-muted">
              {current.category} · {current.readingTime} min · {current.date}
            </p>
          </>
        ) : null}
      </aside>
    </div>
  );
}
