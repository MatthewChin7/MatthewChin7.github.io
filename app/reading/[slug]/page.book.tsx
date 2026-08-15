import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { EngagementPanel } from "@/components/content/engagement-panel";
import { getAllReading, getReading } from "@/lib/content/load";
import { formatDate } from "@/lib/content/derive";
import { site } from "@/lib/site/config";

const statusLabels = {
  reading: "Currently reading",
  read: "Read",
  "to-read": "To read",
} as const;

export function generateStaticParams() {
  return getAllReading().map((book) => ({ slug: book.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = getReading(slug);
  if (!book) return {};
  return {
    title: `${book.title} — Review`,
    description: `Reading notes and review of ${book.title} by ${book.author}.`,
    alternates: { canonical: `${site.url}/reading/${book.slug}` },
  };
}

export default async function BookReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = getReading(slug);
  if (!book) notFound();

  const date = book.finished ?? book.started;

  return (
    <article>
      <header className="border-b border-rule">
        <Container className="py-12 md:py-16">
          <p className="mb-6 text-sm font-bold text-faint">
            <Link href="/reading" className="hover:text-signal">
              Reading
            </Link>{" "}
            / Book review
          </p>
          <div className="grid items-center gap-10 md:grid-cols-[14rem_1fr] lg:gap-16">
            <div className="book-perspective mx-auto w-full max-w-[14rem] md:mx-0">
              <div className="book-cover relative aspect-[2/3] overflow-hidden bg-surface">
                {book.cover ? (
                  <Image
                    src={book.cover}
                    alt={`Cover of ${book.title}`}
                    fill
                    priority
                    sizes="(max-width: 768px) 60vw, 14rem"
                    className="object-cover"
                  />
                ) : null}
              </div>
            </div>
            <div>
              <p className="mb-4 text-sm font-bold text-signal">
                {statusLabels[book.status]}
              </p>
              <h1 className="type-display-xl max-w-[18ch]">{book.title}</h1>
              <p className="mt-5 text-xl italic text-muted">by {book.author}</p>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-faint">
                {date ? <time dateTime={date}>{formatDate(date)}</time> : null}
                {book.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
              {book.link ? (
                <a
                  href={book.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-editorial mt-6 inline-block font-bold text-muted"
                >
                  Book details ↗
                </a>
              ) : null}
            </div>
          </div>
        </Container>
      </header>

      <Container className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl">
          <section aria-labelledby="review-heading" className="prose">
            <h2 id="review-heading">Review</h2>
            {book.note ? (
              <p>{book.note}</p>
            ) : (
              <p className="italic text-muted">Review forthcoming.</p>
            )}
          </section>

          <EngagementPanel contentKey={`reading/${book.slug}`} title={book.title} />
        </div>
      </Container>
    </article>
  );
}
