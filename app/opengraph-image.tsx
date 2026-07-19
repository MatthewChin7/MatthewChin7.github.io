import { ImageResponse } from "next/og";
import { OgCard, ogSize } from "@/lib/seo/og-template";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "Matthew Chin — The Signal Archive";

export default function OpenGraphImage() {
  return new ImageResponse(
    <OgCard
      kicker="The Signal Archive"
      title="I study systems that move—markets, fluids, models, and institutions."
      meta="Harvard · Mathematics / Statistics / CS"
    />,
    size,
  );
}
