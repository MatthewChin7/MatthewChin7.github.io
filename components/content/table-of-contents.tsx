"use client";

import { useEffect, useState } from "react";
import type { TocEntry } from "@/lib/content/toc";

/**
 * Desktop: sticky margin rail with scroll-spy. Mobile: rendered inside a
 * <details> disclosure by the article page. Works as a plain link list
 * without JS; the spy only decorates.
 */
export function TableOfContents({ entries }: { entries: TocEntry[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const headings = entries
      .map((e) => document.getElementById(e.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (obsEntries) => {
        const visible = obsEntries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <nav aria-label="Table of contents">
      <p className="type-mono-label mb-3 text-faint">Contents</p>
      <ol className="space-y-1.5 border-l border-rule">
        {entries.map((e) => (
          <li key={e.id}>
            <a
              href={`#${e.id}`}
              aria-current={activeId === e.id ? "true" : undefined}
              className={`block border-l py-0.5 text-sm transition-colors duration-[var(--t-micro)] ${
                e.level === 3 ? "pl-7" : "pl-4"
              } ${
                activeId === e.id
                  ? "-ml-px border-signal text-fg"
                  : "-ml-px border-transparent text-muted hover:text-fg"
              }`}
            >
              {e.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
