import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon: the MC monogram on the day-mode paper ground. */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f2ea",
      }}
    >
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
        <path
          d="M4 26 V6 L9.5 18 L15 6 V26"
          stroke="#2c2d38"
          strokeWidth="3"
          strokeLinecap="square"
        />
        <path
          d="M28.8 10.7 A7.5 7.5 0 1 0 28.8 21.3"
          stroke="#2c2d38"
          strokeWidth="3"
          strokeLinecap="square"
        />
        <circle cx="9.5" cy="18" r="2.75" fill="#2f4bc7" />
      </svg>
    </div>,
    size,
  );
}
