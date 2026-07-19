/**
 * Shared Open Graph card template (1200×630), rendered with next/og.
 * Vercel's Satori supports a CSS subset — keep styles simple and inline.
 */
export function OgCard({
  kicker,
  title,
  meta,
}: {
  kicker: string;
  title: string;
  meta?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#f5f2ea",
        color: "#2c2d38",
        padding: "64px 72px",
        fontFamily: "Georgia, serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 24,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#6b6c78",
          }}
        >
          {kicker}
        </div>
        <svg width="56" height="56" viewBox="0 0 32 32" fill="none">
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
      </div>

      <div
        style={{
          display: "flex",
          fontSize: title.length > 60 ? 56 : 68,
          lineHeight: 1.1,
          maxWidth: 980,
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "2px solid #d8d4c8",
          paddingTop: 28,
        }}
      >
        <div style={{ display: "flex", fontSize: 26, color: "#6b6c78" }}>
          Matthew Chin — The Signal Archive
        </div>
        {meta ? (
          <div style={{ display: "flex", fontSize: 24, color: "#2f4bc7" }}>{meta}</div>
        ) : null}
      </div>
    </div>
  );
}

export const ogSize = { width: 1200, height: 630 };
