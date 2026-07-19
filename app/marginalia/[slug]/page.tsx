import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { RelatedContent } from "@/components/content/related-content";
import { DraftMark } from "@/components/content/marks";
import { getAllMusings, getMusing } from "@/lib/content/load";
import { relatedContent } from "@/lib/content/related";
import { formatDate } from "@/lib/content/derive";
import { site } from "@/lib/site/config";

export function generateStaticParams() {
  return getAllMusings().map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const musing = getMusing(slug);
  if (!musing) return {};
  const title = musing.title ?? `Marginalia — ${musing.date}`;
  return {
    title,
    description: musing.body.slice(0, 160),
    alternates: { canonical: `${site.url}/marginalia/${musing.slug}` },
    robots: musing.draft ? { index: false } : undefined,
  };
}

export default async function MusingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const musing = getMusing(slug);
  if (!musing) notFound();

  const related = relatedContent(musing);

  return (
    <Container className="py-14">
      <article className="mx-auto max-w-2xl">
        <p className="type-mono-meta mb-8 text-faint">
          <Link href="/marginalia" className="hover:text-fg">
            [03] Marginalia
          </Link>{" "}
          / <span className="text-annotation">{musing.type}</span>
          {musing.draft ? (
            <span className="ml-3">
              <DraftMark />
            </span>
          ) : null}
        </p>
        <p className="type-mono-meta text-muted">
          <time dateTime={musing.date}>{formatDate(musing.date)}</time>
        </p>
        {musing.title ? (
          <h1 className="type-display mt-2">{musing.title}</h1>
        ) : (
          <h1 className="sr-only">Marginalia entry from {formatDate(musing.date)}</h1>
        )}
        <div className="mt-6 border-l border-annotation pl-6">
          <p className="font-serif text-2xl leading-relaxed">{musing.body}</p>
        </div>
        {musing.externalUrl ? (
          <p className="type-mono-meta mt-6">
            <a
              href={musing.externalUrl}
              rel="noopener noreferrer"
              target="_blank"
              className="link-editorial text-muted"
            >
              Referenced source ↗
            </a>
          </p>
        ) : null}
        {musing.tags.length > 0 ? (
          <p className="type-mono-meta mt-6 flex flex-wrap gap-3 text-faint">
            {musing.tags.map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </p>
        ) : null}
        <RelatedContent items={related} />
      </article>
    </Container>
  );
}
