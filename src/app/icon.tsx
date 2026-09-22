import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export function Mark({ scale = 1 }: { scale?: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f2ec",
        color: "#1d1b18",
        fontSize: 190 * scale,
        fontFamily: "serif",
        letterSpacing: -8 * scale,
      }}
    >
      100
      <span style={{ fontStyle: "italic", color: "#6b5a3e" }}>b</span>
    </div>
  );
}

export default function Icon() {
  return new ImageResponse(<Mark />, size);
}
