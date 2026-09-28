import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const headshot = fs
    .readFileSync(
      path.join(process.cwd(), "public/images/mentor-headshot.jpg"),
    )
    .toString("base64");

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
          gap: 28,
          backgroundColor: "#eff6ff",
          padding: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderRadius: 999,
            border: "2px solid #bfdbfe",
            backgroundColor: "#ffffff",
            padding: "14px 32px",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              backgroundColor: "#2563eb",
              display: "flex",
            }}
          />
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: 4,
              color: "#0f172a",
            }}
          >
            CREATOR BLUEPRINT · FREE ACCESS
          </div>
        </div>

        <div
          style={{
            display: "flex",
            textAlign: "center",
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.15,
            color: "#0f172a",
            maxWidth: 980,
          }}
        >
          This Used To Be Part Of My $4,000 Course. Now It&apos;s Free.
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginTop: 12,
          }}
        >
          <img
            src={`data:image/jpeg;base64,${headshot}`}
            alt="Maddox"
            width={64}
            height={64}
            style={{ borderRadius: 999, border: "3px solid #ffffff" }}
          />
          <div style={{ display: "flex", fontSize: 32, color: "#64748b" }}>
            brandacquisition.co/free-course
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
