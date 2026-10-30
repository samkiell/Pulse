import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Pulse: Runtime Crash Alerting & AI Diagnosis for Rumpty Cloud";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#0B0C10",
          padding: "80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0, 229, 255, 0.15) 0%, rgba(106, 17, 255, 0) 70%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#12141A",
              border: "1px solid #232734",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 16h6l2.5-7 4 15 3.5-11 2 4.5 2-1.5h6"
                stroke="#00E5FF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span style={{ fontSize: "36px", fontWeight: "bold", color: "#E6E8EE", letterSpacing: "-0.03em" }}>
            Pulse
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "900px" }}>
          <div
            style={{
              fontSize: "56px",
              fontWeight: 800,
              color: "#E6E8EE",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
            }}
          >
            Know when your Rumpty app crashes, before your users tell you.
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "#8A90A2",
              lineHeight: 1.4,
            }}
          >
            Instant Telegram alerts with likely causes and AI suggested fixes. Built for Node.js apps deployed on Rumpty Cloud.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
            fontSize: "18px",
            color: "#8A90A2",
            borderTop: "1px solid #232734",
            paddingTop: "32px",
            width: "100%",
          }}
        >
          <span>One-line SDK</span>
          <span>•</span>
          <span>Zero-log overhead</span>
          <span>•</span>
          <span>Telegram alerts</span>
          <span>•</span>
          <span>AI root cause diagnosis</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
