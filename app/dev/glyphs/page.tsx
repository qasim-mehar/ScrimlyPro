import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/action-guard";

import { DevGlyphTorture } from "@/components/graphics/dev-glyph-torture";

export const dynamic = "force-dynamic";

export default async function DevGlyphsPage() {
  if (process.env.NODE_ENV === "production") notFound();

  // WP6: authenticated users only (dev pages render fixtures; no tenant reads).
  await requireUser();

  return (
    <main className="mx-auto max-w-2xl p-4">
      <DevGlyphTorture />
    </main>
  );
}
