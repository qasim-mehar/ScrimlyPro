"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client — auth state hints for the UI only (e.g. header email).
 * NEVER the basis of an authorization decision; the server always re-checks
 * via getAuthedUser() / requireUser().
 */
export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
