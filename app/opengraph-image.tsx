import { ImageResponse } from "next/og";
import { OgCard, ogSize } from "@/lib/seo/og-template";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = "image/png";
export const alt = "Matthew Chin";

export default function OpenGraphImage() {
  return new ImageResponse(
    <OgCard
      kicker="Matthew Chin"
      title="About, work, and writing."
      meta="Personal website"
    />,
    size,
  );
}
