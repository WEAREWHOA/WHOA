import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same generated-favicon approach as app/icon.tsx, sized for iOS home
// screen icons — no real logo asset exists yet.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ff2f1a 0%, #ff7a00 55%, #ffb800 100%)",
        }}
      >
        <span
          style={{
            fontSize: 110,
            fontWeight: 900,
            color: "#0a0806",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          W
        </span>
      </div>
    ),
    { ...size },
  );
}
