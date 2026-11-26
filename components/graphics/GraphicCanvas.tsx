"use client";

import { useEffect, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import {
  imageFitStyle,
  slotToStyle,
  type DecorShape,
  type GraphicVariant,
  type Slot,
  type TemplateConfig,
} from "@/lib/graphics";

import { GraphicLoadingOverlay } from "./GraphicLoadingOverlay";

export type { GraphicVariant };

const FONT_STACK = '"Exo 2", "Rajdhani", "Noto Sans Symbols 2", sans-serif';

// brand law — position + text fixed (PRD §4: watermark always rendered; it is
// the growth engine). Only the INK is per-theme (palette.watermarkColor) and
// the announcement variant may drop it lower (config.watermarkYOffset, P7).
const WATERMARK_SLOT: Slot = { x: 730, y: 1570, w: 280, align: "right" };
const WATERMARK_FONT = `600 26px ${FONT_STACK}`;

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

type GraphicCanvasProps = {
  config: TemplateConfig;
  variant: GraphicVariant;
  stageRef?: RefObject<HTMLDivElement | null>;
  /** Notifies previews so they can hold PNG export until the art is ready. */
  onLoadingChange?: (loading: boolean) => void;
  children?: ReactNode;
};

export function GraphicCanvas({ config, variant, stageRef, onLoadingChange, children }: GraphicCanvasProps) {
  const background = config.backgrounds[variant];
  const imageSrc = background.type === "image" ? background.src : null;
  // Switching aesthetics swaps the config (text + palette) immediately, but
  // the new 2–8 MB art arrives later. Track the src that actually settled so
  // the skeleton covers the whole poster until art and text agree again.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [errorSrc, setErrorSrc] = useState<string | null>(null);
  const loading = imageSrc !== null && loadedSrc !== imageSrc && errorSrc !== imageSrc;

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // P7: only the announcement variant honors watermarkYOffset (pmpl-light's
  // footer strip); standings/mvp keep the brand-law y exactly.
  const watermarkY = WATERMARK_SLOT.y + (variant === "announcement" ? (config.watermarkYOffset ?? 0) : 0);
  return (
    <div
      aria-busy={loading || undefined}
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
            // A uniformly fitted portrait art may leave side bars; fill them
            // with the art's own edge ink instead of exposing a transparent
            // strip in the exported PNG. Full-cover arts are unaffected.
            background:
              background.type === "gradient" ? background.css : (config.canvasBackground ?? undefined),
            fontFamily: FONT_STACK,
            color: config.palette.text,
          }}
        >
          {background.type === "gradient" ? (
            background.decor.map((shape) => <DecorShapeView key={`${shape.kind}-${shape.x}-${shape.y}`} shape={shape} />)
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={background.src}
              src={background.src}
              alt=""
              style={imageFitStyle(background)}
              // A cached image can finish before React attaches onLoad —
              // `complete` in the commit-phase ref closes that gap.
              ref={(node) => {
                if (node?.complete && node.naturalWidth > 0) {
                  setLoadedSrc(background.src);
                }
              }}
              onLoad={() => setLoadedSrc(background.src)}
              onError={() => setErrorSrc(background.src)}
            />
          )}
          {children}
          <div
            style={{
              ...slotToStyle(WATERMARK_SLOT),
              top: watermarkY,
              font: WATERMARK_FONT,
              color: config.palette.watermarkColor,
            }}
          >
            scrimlypro.com
          </div>
        </div>
      </div>
      <GraphicLoadingOverlay loading={loading} />
      {loading ? (
        <span className="sr-only" role="status">
          Loading graphic background…
        </span>
      ) : null}
    </div>
  );
}
