import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generated from the theme's own flame gradient, same convention as
// app/icon.tsx — no real marketing/OG asset exists yet.
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
          background: "linear-gradient(135deg, #ff2f1a 0%, #ff7a00 55%, #ffb800 100%)",
        }}
      >
        <span
          style={{
            fontSize: 220,
            fontWeight: 900,
            letterSpacing: -4,
            color: "#0a0806",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          WHOA
        </span>
        <span
          style={{
            marginTop: 12,
            fontSize: 32,
            fontWeight: 600,
            color: "#0a0806",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Shop it. Share it. Earn on it.
        </span>
      </div>
    ),
    { ...size },
  );
}
