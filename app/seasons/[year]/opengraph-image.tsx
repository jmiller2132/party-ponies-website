import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        padding: "64px",
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f1a0f 100%)",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* Big year watermark */}
      <div
        style={{
          position: "absolute",
          top: 32,
          right: 48,
          fontSize: 220,
          fontWeight: 900,
          color: "rgba(255,255,255,0.04)",
          lineHeight: 1,
          letterSpacing: "-0.04em",
        }}
      >
        {year}
      </div>

      {/* Breadcrumb */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
        <span style={{ color: "#6b7280", fontSize: 16, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          PARTY PONIES
        </span>
        <span style={{ color: "#374151", fontSize: 16 }}>›</span>
        <span style={{ color: "#6b7280", fontSize: 16, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          SEASONS
        </span>
      </div>

      {/* Season title */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {year}
        </span>
        <span
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#4ade80",
            lineHeight: 1,
            letterSpacing: "-0.01em",
            textTransform: "uppercase",
          }}
        >
          Season
        </span>
      </div>

      <p style={{ color: "#9ca3af", fontSize: 20, marginTop: 20 }}>
        Standings, champion, PPSI scores &amp; playoff bracket
      </p>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          background: "linear-gradient(90deg, #4ade80, #22c55e, transparent)",
        }}
      />
    </div>,
    { ...size }
  )
}
