import { ImageResponse } from "next/og";

export const alt = "Dreamly — AI Dream Interpreter & Dream Journal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          backgroundImage:
            "radial-gradient(circle at 20% 15%, rgba(151,117,250,0.25), transparent 45%), radial-gradient(circle at 80% 85%, rgba(77,171,247,0.2), transparent 45%)",
        }}
      >
        <div
          style={{
            fontSize: 130,
            fontWeight: 700,
            letterSpacing: "0.02em",
            backgroundImage:
              "linear-gradient(90deg, #ff4d6d 0%, #ff9e00 18%, #ffd60a 36%, #38d39f 54%, #4dabf7 72%, #9775fa 100%)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Dreamly
        </div>
        <div style={{ fontSize: 42, color: "#e5e5e5", marginTop: 24, fontWeight: 500 }}>
          AI Dream Interpreter & Dream Journal
        </div>
        <div style={{ fontSize: 28, color: "#8a8a8a", marginTop: 18 }}>
          dreamly.art
        </div>
      </div>
    ),
    size,
  );
}
