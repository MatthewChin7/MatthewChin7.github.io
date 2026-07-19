import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { PlateHeader } from "@/components/layout/plate-header";
import { CopyButton } from "@/components/ui/copy-button";
import { PrintButton } from "@/components/ui/print-button";
import { resume } from "@/content/resume/resume";
import { formatDate } from "@/lib/content/derive";

export const metadata: Metadata = {
  title: "Résumé",
  description:
    "Curriculum vitae — education, research, and selected work of Matthew Chin.",
};

export default async function ResumePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const detailed = view === "detailed";

  return (
    <Container className="py-14">
      <div data-no-print>
        <PlateHeader
          coordinate="06"
          label="Curriculum vitae"
          aside={`Updated ${formatDate(resume.updated)}`}
          as="h1"
        />
        <div className="mb-10 flex flex-wrap items-center gap-3">
          <span className="type-mono-label text-faint">View</span>
          <Link
            href="/resume"
            aria-current={!detailed ? "true" : undefined}
            className={`type-mono-meta border px-2.5 py-1 ${!detailed ? "border-signal text-signal" : "border-rule text-muted hover:border-rule-strong"}`}
          >
            concise
          </Link>
          <Link
            href="/resume?view=detailed"
            aria-current={detailed ? "true" : undefined}
            className={`type-mono-meta border px-2.5 py-1 ${detailed ? "border-signal text-signal" : "border-rule text-muted hover:border-rule-strong"}`}
          >
            detailed
          </Link>
          <span className="mx-2 h-4 w-px bg-rule" aria-hidden />
          <PrintButton />
          <a
            href="/resume.pdf"
            className="type-mono-label border border-rule px-3 py-2 text-muted transition-colors duration-[var(--t-micro)] hover:border-rule-strong hover:text-fg"
            data-print-url
          >
            PDF ↓
          </a>
          <CopyButton text={resume.email} label="Copy email address" />
        </div>
      </div>

      <div className="mx-auto max-w-3xl lg:mx-0">
        <header className="border-b border-rule-strong pb-6">
          <h2 className="type-display">{resume.name}</h2>
          <p className="mt-2 max-w-[56ch] text-muted">{resume.headline}</p>
          <p className="type-mono-meta mt-3 flex flex-wrap gap-x-5 text-faint">
            <a href={`mailto:${resume.email}`} className="hover:text-fg" data-print-url>
              {resume.email}
            </a>
            <span>{resume.location}</span>
          </p>
        </header>

        {resume.sections.map((section) => (
          <section
            key={section.id}
            aria-labelledby={`cv-${section.id}`}
            className="border-b border-rule py-6"
          >
            <h3 id={`cv-${section.id}`} className="type-mono-label mb-4 text-muted">
              {section.label}
            </h3>
            <ul className="space-y-5">
              {section.items.map((item, i) => (
                <li key={i} className="grid gap-1 sm:grid-cols-[1fr_auto] sm:gap-6">
                  <div>
                    <p className="font-medium text-fg">
                      {item.title}
                      {item.org ? (
                        <span className="font-normal text-muted"> — {item.org}</span>
                      ) : null}
                    </p>
                    {item.summary ? (
                      <p className="mt-1 max-w-[62ch] text-sm text-muted">
                        {item.summary}
                      </p>
                    ) : null}
                    {detailed && item.detail ? (
                      <ul className="mt-2 space-y-1">
                        {item.detail.map((d, j) => (
                          <li key={j} className="flex gap-2 text-sm text-muted">
                            <span aria-hidden className="text-annotation">
                              —
                            </span>
                            {d}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {item.placeholder ? (
                      <p className="type-mono-meta mt-1 text-annotation" data-no-print>
                        Placeholder — awaiting verified details
                      </p>
                    ) : null}
                  </div>
                  <p className="type-mono-meta text-faint">
                    {[item.period, item.location].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="type-mono-meta mt-6 text-faint" data-no-print>
          The PDF at /resume.pdf is a placeholder until a signed-off copy is exported.
          This page is the canonical version.
        </p>
      </div>
    </Container>
  );
}
