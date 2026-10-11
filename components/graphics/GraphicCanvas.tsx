"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { slotToStyle, type DecorShape, type Slot, type TemplateConfig } from "@/lib/graphics";

const FONT_STACK = '"Rajdhani", "Noto Sans Symbols 2", sans-serif';

// brand law — position + text fixed (PRD §4: watermark always rendered; it is
// the growth engine). Only the INK is per-theme (palette.watermarkColor).
const WATERMARK_SLOT: Slot = { x: 760, y: 1570, w: 280, align: "right" };
const WATERMARK_FONT = "600 26px Rajdhani, sans-serif";

function DecorShapeView({ shape }: { shape: DecorShape }) {
  const style: CSSProperties = {
    position: "absolute",
    left: shape.x,
    top: shape.y,
    width: shape.w,
    height: shape.kind === "circle" ? shape.w : (shape.h ?? shape.w),
    background: shape.color,
    opacity: shape.opacity ?? 1,
    pointerEvents: "none",
  };
  if (shape.kind === "circle") style.borderRadius = "50%";
  return <div style={style} />;
}

export type GraphicVariant = "standings" | "mvp" | "announcement";

type GraphicCanvasProps = {
  config: TemplateConfig;
  variant: GraphicVariant;
  stageRef?: RefObject<HTMLDivElement | null>;
  children?: ReactNode;
};

export function GraphicCanvas({ config, variant, stageRef, children }: GraphicCanvasProps) {
  const background = config.backgrounds[variant];
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1080 / 1620",
        containerType: "inline-size",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1080,
          height: 1620,
          // scale() needs a NUMBER: the spec's "calc(100cqw / 1080)" is length-typed
          // (length ÷ number) and engines drop it; length ÷ length → number is the
          // equivalent expression (verified in-browser: matrix(0.592593, …) at 640px).
          transform: "scale(calc(100cqw / 1080px))",
          transformOrigin: "top left",
        }}
      >
        <div
          ref={stageRef}
          style={{
            position: "relative",
            width: 1080,
            height: 1620,
            overflow: "hidden",
            background: background.type === "gradient" ? background.css : undefined,
            fontFamily: FONT_STACK,
            color: config.palette.text,
          }}
        >
          {background.type === "gradient" ? (
            background.decor.map((shape) => <DecorShapeView key={`${shape.kind}-${shape.x}-${shape.y}`} shape={shape} />)
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={background.src}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
          {children}
          <div
            style={{
              ...slotToStyle(WATERMARK_SLOT),
              font: WATERMARK_FONT,
              color: config.palette.watermarkColor,
            }}
          >
            scrimlypro.com
          </div>
        </div>
      </div>
    </div>
  );
}
