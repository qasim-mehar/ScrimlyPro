import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/action-guard";

export const dynamic = "force-dynamic";

/** Dev-only route that throws at render time to exercise app/error.tsx. */
export default async function DevBoomPage() {
  if (process.env.NODE_ENV === "production") notFound();

  // WP6: authenticated users only (dev pages render fixtures; no tenant reads).
  await requireUser();

  throw new Error("dev boom — error.tsx verification");
}
