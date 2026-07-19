"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { querySearchIndex, type SearchDoc, type SearchResult } from "@/lib/search/query";

const typeLabels: Record<SearchDoc["type"], string> = {
  project: "Work",
  note: "Note",
  musing: "Marginalia",
  video: "Video",
  topic: "Topic",
  page: "Go to",
};

let indexCache: SearchDoc[] | null = null;

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [docs, setDocs] = useState<SearchDoc[] | null>(indexCache);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // reset the highlighted row when the palette reopens (render-time adjust)
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setSelected(0);
  }

  useEffect(() => {
    if (!open || indexCache) return;
    let cancelled = false;
    fetch("/search-index.json")
      .then((r) => r.json())
      .then((data: SearchDoc[]) => {
        indexCache = data;
        if (!cancelled) setDocs(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  const results: SearchResult[] = useMemo(() => {
    if (!docs) return [];
    if (!query.trim())
      return docs.filter((d) => d.type === "page").map((doc) => ({ doc, score: 0 }));
    return querySearchIndex(docs, query).slice(0, 12);
  }, [docs, query]);

  function go(doc: SearchDoc) {
    onOpenChange(false);
    setQuery("");
    router.push(doc.url);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && results[selected]) {
      e.preventDefault();
      go(results[selected]!.doc);
    }
  }

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-fg/25 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed top-[12vh] left-1/2 z-[95] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 border border-rule-strong bg-bg shadow-[0_16px_48px_-16px_rgb(0_0_0/0.3)]"
          aria-describedby={undefined}
          onKeyDown={onKeyDown}
        >
          <Dialog.Title className="sr-only">Search the archive</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-rule px-4">
            <span className="type-mono-meta text-faint" aria-hidden>
              ⌕
            </span>
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(0);
              }}
              placeholder="Search projects, notes, marginalia, topics…"
              className="h-12 flex-1 bg-transparent text-fg outline-none placeholder:text-faint"
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-results"
              aria-activedescendant={
                results[selected] ? `palette-opt-${selected}` : undefined
              }
            />
            <kbd className="type-mono-meta hidden text-faint sm:block">esc</kbd>
          </div>
          <ul
            id="palette-results"
            role="listbox"
            ref={listRef}
            aria-label="Search results"
            className="max-h-[50vh] overflow-y-auto py-2"
          >
            {docs === null ? (
              <li className="type-mono-meta px-4 py-3 text-muted">Loading index…</li>
            ) : results.length === 0 ? (
              <li className="type-mono-meta px-4 py-3 text-muted">
                Nothing in the archive matches &ldquo;{query}&rdquo;.
              </li>
            ) : (
              results.map(({ doc }, i) => (
                <li
                  key={doc.id}
                  id={`palette-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === selected}
                  className={`cursor-pointer px-4 py-2.5 ${
                    i === selected ? "bg-signal-soft" : ""
                  }`}
                  onMouseEnter={() => setSelected(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(doc);
                  }}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="type-mono-label w-20 shrink-0 text-faint">
                      {typeLabels[doc.type]}
                    </span>
                    <span className="flex-1 truncate text-fg">{doc.title}</span>
                    {doc.date ? (
                      <span className="type-mono-meta shrink-0 text-faint">
                        {doc.date.replaceAll("-", ".")}
                      </span>
                    ) : null}
                  </div>
                  {doc.tags.length > 0 ? (
                    <p className="type-mono-meta mt-0.5 pl-23 text-faint">
                      {doc.tags.slice(0, 4).join(" · ")}
                    </p>
                  ) : null}
                </li>
              ))
            )}
          </ul>
          <div className="type-mono-meta flex gap-4 border-t border-rule px-4 py-2 text-faint">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span>esc close</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
