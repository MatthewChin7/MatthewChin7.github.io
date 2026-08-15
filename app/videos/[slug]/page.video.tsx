import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { DraftMark } from "@/components/content/marks";
import { RelatedContent } from "@/components/content/related-content";
import { EngagementPanel } from "@/components/content/engagement-panel";
import { VideoEmbed } from "@/components/mdx/video-embed";
import { getAllVideos, getVideo } from "@/lib/content/load";
import { relatedContent } from "@/lib/content/related";
import { formatDate } from "@/lib/content/derive";
import { site } from "@/lib/site/config";

// Only published videos get a page. `dynamicParams: false` makes that list
// exhaustive, which is what a static export needs: no server is standing by to
// render a slug that was not built.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllVideos().map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const video = getVideo(slug);
  if (!video) return {};
  return {
    title: video.title,
    description: video.description,
    alternates: { canonical: `${site.url}/videos/${video.slug}` },
    robots: video.draft ? { index: false } : undefined,
  };
}

function formatTimestamp(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.round(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function VideoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const video = getVideo(slug);
  if (!video) notFound();

  const related = relatedContent(video);

  return (
    <Container className="py-14">
      <article>
        <p className="type-mono-meta mb-6 text-faint">
          <Link href="/videos" className="hover:text-fg">
            [04] Videos
          </Link>{" "}
          / {video.slug}
          {video.draft ? (
            <span className="ml-3">
              <DraftMark />
            </span>
          ) : null}
        </p>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <h1 className="type-display max-w-[24ch]">{video.title}</h1>
            <p className="type-mono-meta mt-3 flex flex-wrap gap-x-4 text-faint">
              <time dateTime={video.date}>{formatDate(video.date)}</time>
              <span>{video.duration}</span>
              <span>{video.provider}</span>
            </p>
            <div className="mt-6">
              <VideoEmbed
                provider={video.provider}
                embedId={video.embedId}
                title={video.title}
                poster={video.poster}
              />
            </div>
            <p className="mt-6 max-w-[62ch] text-muted">{video.description}</p>

            {video.transcript ? (
              <section aria-labelledby="transcript-heading" className="mt-10">
                <h2 id="transcript-heading" className="type-mono-label mb-4 text-muted">
                  Transcript
                </h2>
                <div className="prose border-l border-rule pl-6 text-[0.95rem] whitespace-pre-wrap">
                  {video.transcript}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="lg:col-span-4">
            {video.chapters.length > 0 ? (
              <section aria-labelledby="chapters-heading">
                <h2 id="chapters-heading" className="type-mono-label mb-4 text-faint">
                  Chapters
                </h2>
                <ol className="border-l border-rule">
                  {video.chapters.map((c) => (
                    <li key={c.t} className="flex gap-4 py-2 pl-5">
                      <span className="type-mono-meta w-12 shrink-0 text-annotation">
                        {formatTimestamp(c.t)}
                      </span>
                      <span className="text-sm text-fg">{c.label}</span>
                    </li>
                  ))}
                </ol>
                <p className="type-mono-meta mt-3 text-faint">
                  Chapter seeking activates once the player is loaded.
                </p>
              </section>
            ) : null}
          </aside>
        </div>
        <RelatedContent items={related} />
        <div className="mx-auto max-w-3xl">
          <EngagementPanel contentKey={`videos/${video.slug}`} title={video.title} />
        </div>
      </article>
    </Container>
  );
}
