import { notFound } from "next/navigation";

import { DevSandbox } from "@/components/graphics/dev-sandbox";

export const dynamic = "force-dynamic";

export default function DevGraphicsPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-2xl p-4">
      <DevSandbox />
    </main>
  );
}
