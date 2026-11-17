import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Keep Turbopack's watch scope inside this repo. Without this, the root is
  // inferred from a package-lock.json that lives in the parent folder, so the
  // dev server watches every sibling project and reloads on unrelated writes.
  turbopack: {
    root: path.join(__dirname),
  },
  // Set by the Next.js security upgrade handoff (16.4.3 → 16.4.6).
  experimental: {
    agentUpgrade: "security",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            // Minimal safe-subset CSP (M1 review C2): clickjacking/object/base
            // protections that cannot break Next's own scripts. Full
            // nonce-based CSP is deferred to M4.
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
