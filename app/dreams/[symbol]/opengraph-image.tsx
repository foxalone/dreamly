import { ImageResponse } from "next/og";
import { getDreamEntry } from "@/lib/dream-dictionary";

export const alt = "Dream meaning on Dreamly";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const entry = getDreamEntry(symbol);
  const accent = entry?.accent ?? "#9775fa";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#000000",
          backgroundImage: `radial-gradient(circle at 85% 15%, ${accent}55, transparent 55%), radial-gradient(circle at 10% 90%, ${accent}22, transparent 45%)`,
        }}
      >
        <div style={{ fontSize: 120, display: "flex" }}>{entry?.icon ?? "🌙"}</div>
        <div
          style={{
            marginTop: 36,
            fontSize: entry && entry.title.length > 40 ? 56 : 68,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.15,
            maxWidth: 980,
          }}
        >
          {entry?.title ?? "Dream Dictionary"}
        </div>
        <div
          style={{
            marginTop: 28,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 30,
            color: "#a3a3a3",
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: 9999, backgroundColor: accent, display: "flex" }} />
          Dreamly · Dream Dictionary
        </div>
      </div>
    ),
    { ...size, emoji: "twemoji" },
  );
}
