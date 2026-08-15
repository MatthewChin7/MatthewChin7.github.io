import { ImageResponse } from "next/og";
import { OgCard, ogSize } from "@/lib/seo/og-template";
import { getAllProjects, getProject } from "@/lib/content/load";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllProjects().map((p) => ({ slug: p.slug }));
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  return new ImageResponse(
    <OgCard
      kicker="Work"
      title={project?.title ?? "The Signal Archive"}
      meta={project ? `${project.year} · ${project.status}` : undefined}
    />,
    size,
  );
}
