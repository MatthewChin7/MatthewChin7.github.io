"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { querySearchIndex, type SearchDoc } from "@/lib/search/query";

const typeLabels: Record<SearchDoc["type"], string> = {
  project: "Work",
  note: "Note",
  musing: "Marginalia",
  video: "Video",
  topic: "Topic",
  page: "Page",
};

export function SearchPageClient() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);

  useEffect(() => {
    fetch("/search-index.json")
      .then((r) => r.json())
      .then(setDocs)
      .catch(() => setDocs([]));
  }, []);

  // reflect the query in the URL (replace, not push, per keystroke)
  useEffect(() => {
    const t = setTimeout(() => {
      const url = query ? `/search?q=${encodeURIComponent(query)}` : "/search";
      router.replace(url, { scroll: false });
    }, 250);
    return () => clearTimeout(t);
  }, [query, router]);

  const results = useMemo(() => {
    if (!docs || !query.trim()) return [];
    return querySearchIndex(docs, query).slice(0, 40);
  }, [docs, query]);

  return (
    <div className="max-w-3xl">
      <label htmlFor="archive-search" className="type-mono-label mb-2 block text-muted">
        Query
      </label>
      <input
        id="archive-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="volatility, martingale, localization…"
        className="h-14 w-full border border-rule-strong bg-bg-elevated px-4 font-serif text-2xl text-fg outline-none placeholder:text-faint focus-visible:border-signal"
        autoFocus
      />

      <div aria-live="polite" className="mt-8">
        {docs === null ? (
          <p className="type-mono-meta text-muted">Loading the index…</p>
        ) : !query.trim() ? (
          <p className="type-mono-meta text-muted">
            {docs.length} entries indexed — search titles, tags, and full text.
          </p>
        ) : results.length === 0 ? (
          <p className="text-muted">
            Nothing in the archive matches{" "}
            <span className="font-serif italic">&ldquo;{query}&rdquo;</span>. Try a
            broader term, or browse the{" "}
            <Link href="/atlas" className="link-editorial text-fg">
              Atlas
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="type-mono-meta mb-4 text-muted">
              {results.length} {results.length === 1 ? "match" : "matches"}
            </p>
            <ol>
              {results.map(({ doc }) => (
                <li key={doc.id} className="border-b border-rule first:border-t">
                  <Link href={doc.url} className="group flex items-baseline gap-4 py-3.5">
                    <span className="type-mono-label w-20 shrink-0 text-faint">
                      {typeLabels[doc.type]}
                    </span>
                    <span className="flex-1">
                      <span className="text-fg group-hover:text-signal">{doc.title}</span>
                      {doc.tags.length > 0 ? (
                        <span className="type-mono-meta mt-0.5 block text-faint">
                          {doc.tags.slice(0, 5).join(" · ")}
                        </span>
                      ) : null}
                    </span>
                    {doc.date ? (
                      <span className="type-mono-meta shrink-0 text-faint">
                        {doc.date.replaceAll("-", ".")}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
