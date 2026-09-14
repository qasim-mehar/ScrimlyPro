import { notFound } from "next/navigation";

import { DevGlyphTorture } from "@/components/graphics/dev-glyph-torture";

export const dynamic = "force-dynamic";

export default function DevGlyphsPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-2xl p-4">
      <DevGlyphTorture />
    </main>
  );
}
