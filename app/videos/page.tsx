import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { PlateHeader } from "@/components/layout/plate-header";
import { DraftMark } from "@/components/content/marks";
import { getAllVideos } from "@/lib/content/load";
import { formatDateCompact } from "@/lib/content/derive";

export const metadata: Metadata = {
  title: "Videos",
  description:
    "Video explainers with chapters and transcripts — a contact sheet of moving pictures.",
};

export default function VideosPage() {
  const videos = getAllVideos();

  return (
    <Container className="py-14">
      <PlateHeader
        coordinate="04"
        label="Videos — the screening room"
        aside={`${videos.length} recorded`}
        as="h1"
      />

      {videos.length === 0 ? (
        <div className="max-w-[56ch] py-12">
          <p className="type-display">The projector is warming up.</p>
          <p className="mt-4 text-muted">
            Recordings are in preparation — planned explainers include how a volatility
            smile gets its shape and a ten-minute walkthrough of the advection–diffusion
            equation. Every video will ship with chapters and a full transcript. Until
            then, the same material lives in{" "}
            <Link href="/notes" className="link-editorial text-fg">
              the notes
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v, i) => (
            <li key={v.slug} className="bg-bg">
              <Link href={`/videos/${v.slug}`} className="group block p-5">
                <p className="type-mono-meta mb-3 text-faint">
                  [04.{String(i + 1).padStart(2, "0")}]
                </p>
                <div className="relative aspect-video border border-rule bg-surface">
                  {/* film-frame sprocket marks */}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-1 flex justify-between px-2"
                  >
                    {[...Array(6)].map((_, j) => (
                      <span key={j} className="h-1 w-2 bg-rule" />
                    ))}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg width="18" height="20" viewBox="0 0 12 14" aria-hidden>
                      <path d="M0 0 L12 7 L0 14 Z" fill="var(--muted)" />
                    </svg>
                  </span>
                  <span className="type-mono-meta absolute right-2 bottom-2 bg-bg px-1.5 py-0.5 text-faint">
                    {v.duration}
                  </span>
                </div>
                <h2 className="mt-3 font-serif text-xl group-hover:text-signal">
                  {v.title}
                  {v.draft ? (
                    <span className="ml-3">
                      <DraftMark />
                    </span>
                  ) : null}
                </h2>
                <p className="type-mono-meta mt-1.5 flex flex-wrap gap-x-3 text-faint">
                  <span>{formatDateCompact(v.date)}</span>
                  {v.tags[0] ? <span>{v.tags[0]}</span> : null}
                  {v.transcript ? (
                    <span className="text-annotation">transcript</span>
                  ) : null}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
