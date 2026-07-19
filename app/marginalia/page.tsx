import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { PlateHeader } from "@/components/layout/plate-header";
import { DraftMark } from "@/components/content/marks";
import { getAllMusings } from "@/lib/content/load";
import { formatDateCompact } from "@/lib/content/derive";
import { MARGINALIA_TYPES } from "@/lib/content/schemas";

export const metadata: Metadata = {
  title: "Marginalia",
  description:
    "Short observations, questions, fragments, and book notes — the archive's margins.",
};

export default async function MarginaliaPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const all = getAllMusings();
  const musings = params.type ? all.filter((m) => m.type === params.type) : all;

  // group by year for the stream
  const byYear = new Map<string, typeof musings>();
  for (const m of musings) {
    const year = m.date.slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), m]);
  }

  return (
    <Container className="py-14">
      <PlateHeader
        coordinate="03"
        label="Marginalia — the margins"
        aside={`${musings.length} entries`}
        as="h1"
      />

      <nav
        aria-label="Filter by kind"
        className="mb-12 flex flex-wrap items-baseline gap-2"
      >
        <span className="type-mono-label w-16 text-faint">Kind</span>
        <Link
          href="/marginalia"
          aria-current={!params.type ? "true" : undefined}
          className={`type-mono-meta border px-2.5 py-1 ${!params.type ? "border-signal text-signal" : "border-rule text-muted hover:border-rule-strong"}`}
        >
          All
        </Link>
        {MARGINALIA_TYPES.map((t) => {
          const active = params.type === t;
          return (
            <Link
              key={t}
              href={active ? "/marginalia" : `/marginalia?type=${t}`}
              aria-current={active ? "true" : undefined}
              className={`type-mono-meta border px-2.5 py-1 ${active ? "border-signal text-signal" : "border-rule text-muted hover:border-rule-strong"}`}
            >
              {t}
            </Link>
          );
        })}
      </nav>

      {musings.length === 0 ? (
        <p className="py-16 text-muted">
          Nothing filed under this mark yet —{" "}
          <Link href="/marginalia" className="link-editorial text-fg">
            see everything
          </Link>
          .
        </p>
      ) : (
        <div className="mx-auto max-w-2xl">
          {[...byYear.entries()].map(([year, entries]) => (
            <section key={year} aria-labelledby={`year-${year}`}>
              <h2
                id={`year-${year}`}
                className="type-mono-label sticky top-16 z-10 -mx-2 mb-2 w-fit bg-bg px-2 py-1 text-faint"
              >
                {year}
              </h2>
              <ol className="relative border-l border-rule pb-8 pl-8">
                {entries.map((m) => (
                  <li key={m.id} className="relative pb-8 last:pb-2">
                    <span
                      aria-hidden
                      className="absolute top-2 -left-[calc(2rem+3.5px)] h-[7px] w-[7px] rounded-full border border-rule-strong bg-bg"
                    />
                    <article>
                      <p className="type-mono-meta text-faint">
                        <time dateTime={m.date}>{formatDateCompact(m.date)}</time>
                        {" · "}
                        <span className="text-annotation">{m.type}</span>
                        {m.draft ? (
                          <>
                            {" "}
                            <DraftMark />
                          </>
                        ) : null}
                      </p>
                      {m.title ? (
                        <h3 className="mt-1 font-serif text-2xl leading-snug">
                          <Link
                            href={`/marginalia/${m.slug}`}
                            className="hover:text-signal"
                          >
                            {m.title}
                          </Link>
                        </h3>
                      ) : null}
                      <p className="mt-1.5 leading-relaxed text-fg">{m.body}</p>
                      <p className="type-mono-meta mt-2 flex flex-wrap gap-x-4 text-faint">
                        {m.externalUrl ? (
                          <a
                            href={m.externalUrl}
                            rel="noopener noreferrer"
                            target="_blank"
                            className="link-editorial"
                          >
                            source ↗
                          </a>
                        ) : null}
                        <Link href={`/marginalia/${m.slug}`} className="hover:text-fg">
                          permalink
                        </Link>
                        {m.tags.map((t) => (
                          <span key={t}>#{t}</span>
                        ))}
                      </p>
                    </article>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
