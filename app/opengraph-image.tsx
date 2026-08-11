import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
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
      {/* Top-right trophy */}
      <div
        style={{
          position: "absolute",
          top: 48,
          right: 64,
          fontSize: 96,
          opacity: 0.15,
        }}
      >
        🏆
      </div>

      {/* Est. badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 24,
          padding: "6px 16px",
          background: "rgba(74, 222, 128, 0.15)",
          border: "1px solid rgba(74, 222, 128, 0.4)",
          borderRadius: 999,
        }}
      >
        <span style={{ color: "#4ade80", fontSize: 14, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Est. 2013 · Fantasy Football
        </span>
      </div>

      {/* Title */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
          }}
        >
          PARTY PONIES
        </span>
        <span
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: "#4ade80",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
          }}
        >
          LEAGUE HISTORY
        </span>
      </div>

      {/* Subtitle */}
      <p style={{ color: "#9ca3af", fontSize: 22, marginTop: 20, maxWidth: 600 }}>
        13+ seasons of standings, records, PPSI rankings, and rivalries
      </p>

      {/* Bottom rule */}
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
