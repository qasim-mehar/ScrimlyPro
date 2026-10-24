import { NextResponse } from "next/server";

/**
 * JSON response helper for authenticated API routes: always `no-store` so
 * tenant data is never cached by browsers or shared caches.
 */
export function noStore<T>(body: T, init?: ResponseInit): NextResponse<T> {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
