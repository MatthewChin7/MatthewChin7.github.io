import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { EngagementPanel } from "@/components/content/engagement-panel";
import { ReadingProgress } from "@/components/content/reading-progress";
import { TableOfContents } from "@/components/content/table-of-contents";
import { getAllNotes, getNote } from "@/lib/content/load";
import { renderMdx } from "@/lib/content/mdx";
import { extractToc } from "@/lib/content/toc";
import { formatDate } from "@/lib/content/derive";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { domainLabels } from "@/lib/site/domains";
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

  // series navigation → WP previous/next post links
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
              { name: "Home", url: "/" },
              { name: "Notes", url: "/notes" },
              { name: note.title, url: `/notes/${note.slug}` },
            ]),
          ]),
        }}
      />
      <article>
        {/* Entry header */}
        <header className="border-b border-rule bg-bg">
          <div className="wp-inner py-10 text-center">
            <h1 className="wp-entry-title mx-auto max-w-[22ch] text-3xl sm:text-[2.5rem]">
              {note.title}
            </h1>
            {note.description ? (
              <p className="mx-auto mt-4 max-w-[56ch] font-serif text-lg italic text-muted">
                {note.description}
              </p>
            ) : null}
            <div className="wp-entry-meta mt-5 justify-center">
              <span>
                Posted on <time dateTime={note.date}>{formatDate(note.date)}</time>
              </span>
              <span>
                by <span className="text-fg">{site.name}</span>
              </span>
              {note.updated ? (
                <span>
                  Updated <time dateTime={note.updated}>{formatDate(note.updated)}</time>
                </span>
              ) : null}
              <span>{note.readingTime} min read</span>
            </div>
          </div>
        </header>

        <div className="wp-inner py-10">
          <div className="grid gap-12 lg:grid-cols-[1fr_18rem]">
            <main>
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

              {/* Entry content — MDX with KaTeX math intact */}
              <div className="prose">{body}</div>

              {note.bibliography.length > 0 ? (
                <section className="mt-12 border-t border-rule pt-6">
                  <h2 id="references" className="wp-widget-title">
                    References
                  </h2>
                  <ol className="space-y-2">
                    {note.bibliography.map((item, i) => (
                      <li
                        key={i}
                        id={`ref-${i + 1}`}
                        className="type-mono-meta flex scroll-mt-24 gap-3 text-muted"
                      >
                        <span className="text-faint">[{i + 1}]</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {/* Entry footer — categories + tags */}
              {(note.domains.length > 0 || note.tags.length > 0) && (
                <footer className="mt-10 flex flex-wrap items-center gap-2 border-t border-rule pt-6">
                  {note.domains.map((d) => (
                    <Link key={d} href={`/notes?domain=${d}`} className="wp-term">
                      {domainLabels[d]}
                    </Link>
                  ))}
                  {note.tags.map((t) => (
                    <span key={t} className="wp-term">
                      #{t}
                    </span>
                  ))}
                </footer>
              )}

              {/* Post navigation */}
              {(prev || next) && (
                <nav aria-label={`${note.series} series`} className="wp-post-nav mt-12">
                  {prev ? (
                    <Link href={`/notes/${prev.slug}`}>
                      <span className="wp-nav-dir">← Previous</span>
                      <span className="wp-nav-title">{prev.title}</span>
                    </Link>
                  ) : (
                    <span aria-hidden className="bg-bg" />
                  )}
                  {next ? (
                    <Link href={`/notes/${next.slug}`} className="text-right">
                      <span className="wp-nav-dir">Next →</span>
                      <span className="wp-nav-title">{next.title}</span>
                    </Link>
                  ) : (
                    <span aria-hidden className="bg-bg" />
                  )}
                </nav>
              )}

              {/* Comments — the engagement panel is the site's comment thread */}
              <section id="respond" className="mt-14 border-t border-rule pt-8">
                <EngagementPanel contentKey={`notes/${note.slug}`} title={note.title} />
              </section>
            </main>

            <div className="space-y-10">
              {toc.length > 0 ? (
                <div className="wp-widget sticky top-24 hidden lg:block">
                  <TableOfContents entries={toc} />
                </div>
              ) : null}
              <Sidebar />
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
