"use client";

import { useEffect } from "react";

/**
 * Root-layout error boundary. Per Next docs this replaces the root layout, so
 * global CSS/fonts may be unavailable — everything here uses inline styles and
 * it renders its own <html>/<body>.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0d12",
          color: "#e8eaf0",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: 420,
            padding: 24,
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "#f5c542",
            }}
          >
            SCRIMLY PRO
          </p>
          <div
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 10,
              border: "1px solid #272d3b",
              background: "#12151c",
            }}
          >
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
              Something went wrong
            </h1>
            <p style={{ marginTop: 8, fontSize: 14, color: "#8b93a7" }}>
              A critical error prevented the app from rendering.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                marginTop: 16,
                minHeight: 44,
                width: "100%",
                border: "none",
                borderRadius: 8,
                background: "#f5c542",
                color: "#0b0d12",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
