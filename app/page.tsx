import { redirect } from "next/navigation";

import BenefitsSection from "@/components/landing/BenefitsSection";
import Hero from "@/components/landing/Hero";
import ReserveSection from "@/components/reserve-section";
import SiteFooter from "@/components/site-footer";
import { requireUser } from "@/lib/auth/action-guard";
import { isPlatformAdmin } from "@/lib/auth/platform-role";
import { getAuthedUser } from "@/lib/supabase/server";

/**
 * "/" — public marketing landing for anonymous visitors (landing-page
 * branch; "/" is on PUBLIC_PAGES), role redirect for authenticated users.
 *
 * M5 WP2 + M6 WP2 combined: authenticated users never linger here. A
 * REAL-identity platform admin (impersonation-aware, M6) goes to /admin,
 * everyone else to the member surface /dashboard (M5). requireUser
 * enforces the kill switch first (disabled → /login?disabled=1); an
 * impersonating admin follows the TARGET identity to /dashboard, where
 * app/dashboard/layout.tsx mounts the impersonation banner. No tenant
 * content is rendered on this route anymore, so the banner meta-test's
 * surface list no longer includes it.
 *
 * Deviation from the M5 brief (report §3): anonymous visitors see the
 * marketing landing, NOT a /login redirect — the landing merge postdates
 * the brief and rule 10 keeps the existing pattern. Navigation only: /admin
 * independently re-checks requireAdmin on every request.
 */
function LandingPage() {
  return (
    <>
      <Hero />
      <BenefitsSection />
      <ReserveSection />
      <SiteFooter />
    </>
  );
}

export default async function Home() {
  // Signed-out visitors see the landing page; tenants are routed by role.
  const anon = await getAuthedUser();
  if (!anon) return <LandingPage />;

  // Effective identity + kill switch (the one true guard — no copies).
  const effective = await requireUser();

  // Same identity end-to-end = no impersonation: real admins go to /admin.
  // An impersonating admin follows the target member to /dashboard, never
  // the admin console.
  if (effective.id === anon.id && (await isPlatformAdmin(effective.id))) {
    redirect("/admin");
  }

  redirect("/dashboard");
}
