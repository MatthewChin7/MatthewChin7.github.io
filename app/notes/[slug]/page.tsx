import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { DomainMark, Tag, DraftMark } from "@/components/content/marks";
import { RelatedContent } from "@/components/content/related-content";
import { ReadingProgress } from "@/components/content/reading-progress";
import { TableOfContents } from "@/components/content/table-of-contents";
import { getAllNotes, getNote } from "@/lib/content/load";
import { relatedContent } from "@/lib/content/related";
import { renderMdx } from "@/lib/content/mdx";
import { extractToc } from "@/lib/content/toc";
import { formatDate, formatDateCompact } from "@/lib/content/derive";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { site } from "@/lib/site/config";
import "katex/dist/katex.min.css";

export function generateStaticParams() {
  return getAllNotes().map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) return {};
  return {
    title: note.title,
    description: note.description,
    alternates: { canonical: note.canonical ?? `${site.url}/notes/${note.slug}` },
    robots: note.draft ? { index: false } : undefined,
    openGraph: {
      title: note.title,
      description: note.description,
      type: "article",
      publishedTime: note.date,
      modifiedTime: note.updated,
    },
  };
}

const typeLabels: Record<string, string> = {
  essay: "Essay",
  "research-note": "Research note",
  explainer: "Explainer",
  review: "Review",
};

export default async function NotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) notFound();

  const body = await renderMdx(note.body);
  const toc = extractToc(note.body);
  const related = relatedContent(note);

  // series navigation
  const seriesNotes = note.series
    ? getAllNotes()
        .filter((n) => n.series === note.series)
        .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0))
    : [];
  const seriesIndex = seriesNotes.findIndex((n) => n.slug === note.slug);
  const prev = seriesIndex > 0 ? seriesNotes[seriesIndex - 1] : undefined;
  const next =
    seriesIndex >= 0 && seriesIndex < seriesNotes.length - 1
      ? seriesNotes[seriesIndex + 1]
      : undefined;

  return (
    <>
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            articleJsonLd({
              title: note.title,
              description: note.description,
              url: `/notes/${note.slug}`,
              datePublished: note.date,
              dateModified: note.updated,
            }),
            breadcrumbJsonLd([
              { name: "Index", url: "/" },
              { name: "Notes", url: "/notes" },
              { name: note.title, url: `/notes/${note.slug}` },
            ]),
          ]),
        }}
      />
      <article>
        <header className="border-b border-rule">
          <Container className="py-12">
            <p className="type-mono-meta mb-5 text-faint">
              <Link href="/notes" className="hover:text-fg">
                [02] Notes
              </Link>{" "}
              / {typeLabels[note.type]}
              {note.series ? (
                <span className="text-annotation">
                  {" "}
                  · {note.series} — part {note.seriesOrder}
                </span>
              ) : null}
              {note.draft ? (
                <span className="ml-3">
                  <DraftMark />
                </span>
              ) : null}
            </p>
            <h1 className="type-display-xl max-w-[22ch]">{note.title}</h1>
            <p className="mt-5 max-w-[56ch] font-serif text-xl italic text-muted">
              {note.description}
            </p>
            <dl className="type-mono-meta mt-6 flex flex-wrap gap-x-6 gap-y-1 text-faint">
              <div className="flex gap-2">
                <dt className="sr-only">Published</dt>
                <dd>
                  <time dateTime={note.date}>{formatDate(note.date)}</time>
                </dd>
              </div>
              {note.updated ? (
                <div className="flex gap-2">
                  <dt>Updated</dt>
                  <dd>
                    <time dateTime={note.updated}>{formatDate(note.updated)}</time>
                  </dd>
                </div>
              ) : null}
              <div className="flex gap-2">
                <dt className="sr-only">Reading time</dt>
                <dd>{note.readingTime} min read</dd>
              </div>
              <div className="flex items-center gap-3">
                <dt className="sr-only">Domains</dt>
                {note.domains.map((d) => (
                  <dd key={d}>
                    <DomainMark domain={d} withLabel />
                  </dd>
                ))}
              </div>
            </dl>
          </Container>
        </header>

        <Container className="py-12">
          <div className="grid gap-12 lg:grid-cols-12">
            <aside className="hidden lg:col-span-3 lg:block">
              <div className="sticky top-24">
                <TableOfContents entries={toc} />
              </div>
            </aside>

            <div className="lg:col-span-8 lg:col-start-4 xl:col-span-7">
              {toc.length > 0 ? (
                <details className="mb-8 border border-rule px-4 py-3 lg:hidden">
                  <summary className="type-mono-label cursor-pointer text-muted">
                    Contents
                  </summary>
                  <ol className="mt-3 space-y-1.5">
                    {toc.map((e) => (
                      <li key={e.id} className={e.level === 3 ? "pl-4" : ""}>
                        <a href={`#${e.id}`} className="text-sm text-muted hover:text-fg">
                          {e.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </details>
              ) : null}

              <div className="prose">{body}</div>

              {note.bibliography.length > 0 ? (
                <section className="mt-12 border-t border-rule pt-6">
                  <h2 className="type-mono-label mb-4 text-muted">References</h2>
                  <ol className="space-y-2">
                    {note.bibliography.map((item, i) => (
                      <li key={i} className="type-mono-meta flex gap-3 text-muted">
                        <span className="text-faint">[{i + 1}]</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {note.tags.length > 0 ? (
                <p className="mt-10 flex flex-wrap gap-2">
                  {note.tags.map((t) => (
                    <Tag key={t} tag={t} />
                  ))}
                </p>
              ) : null}

              {(prev || next) && (
                <nav
                  aria-label={`${note.series} series`}
                  className="mt-12 grid gap-px border border-rule bg-rule sm:grid-cols-2"
                >
                  {prev ? (
                    <Link href={`/notes/${prev.slug}`} className="group bg-bg p-5">
                      <span className="type-mono-label text-faint">
                        ← Previous in series
                      </span>
                      <span className="mt-1 block font-serif text-lg group-hover:text-signal">
                        {prev.title}
                      </span>
                    </Link>
                  ) : (
                    <span className="bg-bg p-5" aria-hidden />
                  )}
                  {next ? (
                    <Link
                      href={`/notes/${next.slug}`}
                      className="group bg-bg p-5 text-right"
                    >
                      <span className="type-mono-label text-faint">Next in series →</span>
                      <span className="mt-1 block font-serif text-lg group-hover:text-signal">
                        {next.title}
                      </span>
                    </Link>
                  ) : (
                    <span className="bg-bg p-5" aria-hidden />
                  )}
                </nav>
              )}
            </div>
          </div>
          <RelatedContent items={related} />
        </Container>
      </article>
    </>
  );
}
