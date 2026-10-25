import { redirect } from "next/navigation";

import BenefitsSection from "@/components/landing/BenefitsSection";
import Hero from "@/components/landing/Hero";
import ReserveSection from "@/components/reserve-section";
import SiteFooter from "@/components/site-footer";
import { requireUser } from "@/lib/auth/action-guard";
import { isPlatformAdmin } from "@/lib/dashboard/platform-role";
import { getAuthedUser } from "@/lib/supabase/server";

/**
 * "/" — public marketing landing for anonymous visitors (landing-page
 * branch; "/" is on PUBLIC_PAGES), role redirect for authenticated users.
 *
 * M5 WP2: authenticated users never linger here — platform admins (probe on
 * the EFFECTIVE identity, impersonation-aware) go to /admin, everyone else
 * to /dashboard. requireUser enforces the kill switch first (disabled →
 * /login?disabled=1); an impersonating admin follows the TARGET identity to
 * /dashboard, where the banner (app/dashboard/layout.tsx) is mounted. No
 * tenant content is rendered on this route anymore, so the banner
 * meta-test's surface list no longer includes it.
 *
 * Deviation from the M5 brief (report §3): anonymous visitors see the
 * marketing landing, NOT a /login redirect — the landing merge postdates
 * the brief and rule 10 keeps the existing pattern.
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
  const user = await requireUser();

  if (await isPlatformAdmin(user.id)) redirect("/admin");
  redirect("/dashboard");
}
