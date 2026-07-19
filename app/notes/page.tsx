import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { PlateHeader } from "@/components/layout/plate-header";
import { DomainMark, DraftMark } from "@/components/content/marks";
import { getAllNotes } from "@/lib/content/load";
import { formatDateCompact } from "@/lib/content/derive";
import { NOTE_TYPES } from "@/lib/content/schemas";
import { DOMAINS, domainLabels, type Domain } from "@/lib/site/domains";

export const metadata: Metadata = {
  title: "Notes",
  description:
    "Essays, research notes, explainers, and reviews — the archive's long-form writing.",
};

const typeLabels: Record<string, string> = {
  essay: "Essays",
  "research-note": "Research notes",
  explainer: "Explainers",
  review: "Reviews",
};

interface NotesSearchParams {
  type?: string;
  domain?: string;
  year?: string;
}

function filterLink(params: NotesSearchParams, patch: Partial<NotesSearchParams>) {
  const next = { ...params, ...patch };
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `/notes?${s}` : "/notes";
}

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<NotesSearchParams>;
}) {
  const params = await searchParams;
  const all = getAllNotes();
  const years = [...new Set(all.map((n) => n.date.slice(0, 4)))].sort().reverse();

  const notes = all.filter(
    (n) =>
      (!params.type || n.type === params.type) &&
      (!params.domain || n.domains.includes(params.domain as Domain)) &&
      (!params.year || n.date.startsWith(params.year)),
  );

  const featured = all.filter((n) => n.featured && !n.draft);
  const series = new Map<string, number>();
  for (const n of all)
    if (n.series) series.set(n.series, (series.get(n.series) ?? 0) + 1);

  return (
    <Container className="py-14">
      <PlateHeader
        coordinate="02"
        label="Notes — the journal"
        aside={`${notes.length} of ${all.length}`}
        as="h1"
      />

      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <nav aria-label="Filters" className="mb-8 space-y-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="type-mono-label w-16 text-faint">Kind</span>
              <Link
                href={filterLink(params, { type: undefined })}
                aria-current={!params.type ? "true" : undefined}
                className={`type-mono-meta border px-2.5 py-1 ${!params.type ? "border-signal text-signal" : "border-rule text-muted hover:border-rule-strong"}`}
              >
                All
              </Link>
              {NOTE_TYPES.map((t) => {
                const active = params.type === t;
                return (
                  <Link
                    key={t}
                    href={filterLink(params, { type: active ? undefined : t })}
                    aria-current={active ? "true" : undefined}
                    className={`type-mono-meta border px-2.5 py-1 ${active ? "border-signal text-signal" : "border-rule text-muted hover:border-rule-strong"}`}
                  >
                    {typeLabels[t]}
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="type-mono-label w-16 text-faint">Domain</span>
              {DOMAINS.map((d) => {
                const active = params.domain === d;
                return (
                  <Link
                    key={d}
                    href={filterLink(params, { domain: active ? undefined : d })}
                    aria-current={active ? "true" : undefined}
                    className={`type-mono-meta border px-2.5 py-1 ${active ? "border-signal text-signal" : "border-rule text-muted hover:border-rule-strong"}`}
                  >
                    {domainLabels[d]}
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="type-mono-label w-16 text-faint">Year</span>
              {years.map((y) => {
                const active = params.year === y;
                return (
                  <Link
                    key={y}
                    href={filterLink(params, { year: active ? undefined : y })}
                    aria-current={active ? "true" : undefined}
                    className={`type-mono-meta border px-2.5 py-1 ${active ? "border-signal text-signal" : "border-rule text-muted hover:border-rule-strong"}`}
                  >
                    {y}
                  </Link>
                );
              })}
            </div>
          </nav>

          {notes.length === 0 ? (
            <p className="py-16 text-muted">
              No notes match —{" "}
              <Link href="/notes" className="link-editorial text-fg">
                clear the filters
              </Link>
              .
            </p>
          ) : (
            <ol>
              {notes.map((n, i) => (
                <li key={n.slug} className="border-b border-rule first:border-t">
                  <Link href={`/notes/${n.slug}`} className="group block py-5">
                    <div className="flex items-baseline gap-4">
                      <span className="type-mono-meta w-8 shrink-0 text-faint">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1">
                        <h2 className="type-title group-hover:text-signal">
                          {n.title}
                          {n.draft ? (
                            <span className="ml-3">
                              <DraftMark />
                            </span>
                          ) : null}
                        </h2>
                        <p className="mt-1.5 max-w-[62ch] text-sm text-muted">
                          {n.description}
                        </p>
                        <p className="type-mono-meta mt-2 flex flex-wrap gap-x-4 text-faint">
                          <span>{typeLabels[n.type]?.replace(/s$/, "")}</span>
                          <span>{formatDateCompact(n.date)}</span>
                          <span>{n.readingTime} min</span>
                          {n.series ? (
                            <span className="text-annotation">
                              {n.series} · {n.seriesOrder}
                            </span>
                          ) : null}
                          {n.domains.map((d) => (
                            <DomainMark key={d} domain={d} />
                          ))}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>

        <aside className="lg:col-span-3 lg:col-start-10">
          {featured.length > 0 ? (
            <section aria-labelledby="featured-heading" className="mb-10">
              <h2 id="featured-heading" className="type-mono-label mb-4 text-faint">
                Featured
              </h2>
              <ul className="space-y-4">
                {featured.map((n) => (
                  <li key={n.slug}>
                    <Link href={`/notes/${n.slug}`} className="group block">
                      <span className="font-serif text-lg leading-snug group-hover:text-signal">
                        {n.title}
                      </span>
                      <span className="type-mono-meta mt-1 block text-faint">
                        {formatDateCompact(n.date)} · {n.readingTime} min
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {series.size > 0 ? (
            <section aria-labelledby="series-heading">
              <h2 id="series-heading" className="type-mono-label mb-4 text-faint">
                Series
              </h2>
              <ul className="space-y-2">
                {[...series.entries()].map(([name, count]) => (
                  <li key={name} className="type-mono-meta text-muted">
                    <span className="text-annotation">§</span> {name}
                    <span className="text-faint"> · {count} parts</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </Container>
  );
}
