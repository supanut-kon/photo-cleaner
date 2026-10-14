import React from "react";
import { type FeatherFrame } from "./photoFeather";

export default function PhotoEdgeMask({ frame, children }: { frame: FeatherFrame | null; children: React.ReactNode }) {
  let maskImage: string | undefined;
  if (frame?.axis) {
    const horizontal = frame.axis === "horizontal";
    const start = horizontal ? frame.x : frame.y;
    const end = start + (horizontal ? frame.width : frame.height);
    maskImage = `linear-gradient(to ${horizontal ? "right" : "bottom"}, transparent ${start}px, black ${start + frame.feather}px, black ${end - frame.feather}px, transparent ${end}px)`;
  }
  return <div style={{ position: "absolute", inset: 0, maskImage, WebkitMaskImage: maskImage }}>{children}</div>;
}
