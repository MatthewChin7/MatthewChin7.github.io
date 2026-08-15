import { ImageResponse } from "next/og";
import { OgCard, ogSize } from "@/lib/seo/og-template";
import { getAllNotes, getNote } from "@/lib/content/load";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllNotes().map((n) => ({ slug: n.slug }));
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = getNote(slug);
  return new ImageResponse(
    <OgCard
      kicker="Notes"
      title={note?.title ?? "The Signal Archive"}
      meta={note ? `${note.date} · ${note.readingTime} min` : undefined}
    />,
    size,
  );
}
