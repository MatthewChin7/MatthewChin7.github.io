import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { PlateHeader } from "@/components/layout/plate-header";
import { DraftMark } from "@/components/content/marks";
import { getAllMusings } from "@/lib/content/load";
import { formatDateCompact } from "@/lib/content/derive";

export const metadata: Metadata = {
  title: "Musings",
  description:
    "Short observations, questions, fragments, and book notes — the archive's margins.",
};

export default function MarginaliaPage() {
  const musings = getAllMusings();

  // group by year for the stream
  const byYear = new Map<string, typeof musings>();
  for (const m of musings) {
    const year = m.date.slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), m]);
  }

  return (
    <Container className="py-14">
      <PlateHeader label="Musings" as="h1" />

      {musings.length === 0 ? (
        <p className="py-16 text-muted">Nothing here yet.</p>
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
                    {/* Whole block is the link to the permalink. */}
                    <Link
                      href={`/marginalia/${m.slug}`}
                      className="group block rounded-sm transition-colors hover:bg-surface/60"
                    >
                      <article>
                        <p className="type-mono-meta text-faint">
                          <time dateTime={m.date}>{formatDateCompact(m.date)}</time>
                          {m.draft ? (
                            <>
                              {" "}
                              <DraftMark />
                            </>
                          ) : null}
                        </p>
                        {m.title ? (
                          <h3 className="mt-1 font-serif text-2xl leading-snug group-hover:text-signal">
                            {m.title}
                          </h3>
                        ) : null}
                        <p className="mt-1.5 leading-relaxed text-fg">{m.body}</p>
                        {m.tags.length > 0 ? (
                          <p className="type-mono-meta mt-2 flex flex-wrap gap-x-4 text-faint">
                            {m.tags.map((t) => (
                              <span key={t}>#{t}</span>
                            ))}
                          </p>
                        ) : null}
                      </article>
                    </Link>
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
