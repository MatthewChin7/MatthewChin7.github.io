import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { PlateHeader } from "@/components/layout/plate-header";
import { DraftMark } from "@/components/content/marks";
import { getAllProjects } from "@/lib/content/load";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Project archive — quantitative research, physical modeling, machine learning, and systems built to be used.",
};

export default function WorkPage() {
  const all = getAllProjects();

  // Group by year, newest year first.
  const byYear = new Map<number, typeof all>();
  for (const p of all) byYear.set(p.year, [...(byYear.get(p.year) ?? []), p]);
  const years = [...byYear.keys()].sort((a, b) => b - a);

  return (
    <Container className="py-14">
      <PlateHeader label="Portfolio" as="h1" />

      {all.length === 0 ? (
        <p className="py-16 text-muted">Nothing here yet.</p>
      ) : (
        <div className="space-y-14">
          {years.map((year) => (
            <section key={year} aria-labelledby={`year-${year}`}>
              <h2
                id={`year-${year}`}
                className="type-mono-label mb-6 border-b border-rule pb-2 text-faint"
              >
                {year}
              </h2>
              <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {byYear.get(year)!.map((p) => (
                  <article key={p.slug}>
                    <Link href={`/work/${p.slug}`} className="group block">
                      <h3 className="type-title group-hover:text-signal">
                        {p.title}
                        {p.draft || p.status === "draft" ? (
                          <span className="ml-3 align-middle">
                            <DraftMark />
                          </span>
                        ) : null}
                      </h3>
                      <p className="mt-2 max-w-[52ch] leading-relaxed text-muted">
                        {p.question}
                      </p>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
