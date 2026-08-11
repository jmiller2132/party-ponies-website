import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image({ params }: { params: Promise<{ owner: string }> }) {
  const { owner } = await params
  const name = decodeURIComponent(owner)

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
      {/* Users icon watermark */}
      <div
        style={{
          position: "absolute",
          top: 48,
          right: 64,
          fontSize: 120,
          opacity: 0.08,
        }}
      >
        👤
      </div>

      {/* Breadcrumb */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
        <span style={{ color: "#6b7280", fontSize: 16, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          PARTY PONIES
        </span>
        <span style={{ color: "#374151", fontSize: 16 }}>›</span>
        <span style={{ color: "#6b7280", fontSize: 16, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          MANAGERS
        </span>
      </div>

      {/* Manager name */}
      <span
        style={{
          fontSize: name.length > 14 ? 72 : 96,
          fontWeight: 900,
          color: "#ffffff",
          lineHeight: 1,
          letterSpacing: "-0.02em",
          maxWidth: 900,
        }}
      >
        {name}
      </span>

      {/* Label */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
        <div
          style={{
            padding: "6px 16px",
            background: "rgba(74, 222, 128, 0.15)",
            border: "1px solid rgba(74, 222, 128, 0.4)",
            borderRadius: 999,
          }}
        >
          <span style={{ color: "#4ade80", fontSize: 14, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Manager Profile
          </span>
        </div>
        <span style={{ color: "#6b7280", fontSize: 18 }}>Career stats · PPSI · Head-to-head</span>
      </div>

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
