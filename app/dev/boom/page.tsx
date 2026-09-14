import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/** Dev-only route that throws at render time to exercise app/error.tsx. */
export default function DevBoomPage() {
  if (process.env.NODE_ENV === "production") notFound();

  throw new Error("dev boom — error.tsx verification");
}
