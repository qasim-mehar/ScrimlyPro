// entry point — session list/history arrives with C4.2+
import Link from "next/link";
import { redirect } from "next/navigation";

import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import BenefitsSection from "@/components/landing/BenefitsSection";
import Hero from "@/components/landing/Hero";
import ReserveSection from "@/components/reserve-section";
import SiteFooter from "@/components/site-footer";
import { requireUser } from "@/lib/auth/action-guard";
import { isPlatformAdmin } from "@/lib/auth/platform-role";
import { getAuthedUser } from "@/lib/supabase/server";

/**
 * Public marketing landing (landing-page branch). "/" is on PUBLIC_PAGES, so
 * the proxy lets anonymous visitors through here instead of bouncing them to
 * /login; the copy follows ScrimlyPro-SaaS-explainer.md.
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

/**
 * Role-based landing (M6 WP2). requireUser resolves the EFFECTIVE identity
 * (the impersonation target while a valid impersonation is active, else the
 * real user). A real-identity platform admin who is NOT impersonating lands
 * on the admin console; an impersonating admin follows the target member —
 * admin surfaces stay unreachable under an impersonated session anyway.
 */
export default async function Home() {
  // Signed-out visitors see the landing page, tenants see their home.
  const user = await getAuthedUser();
  if (!user) return <LandingPage />;

  const effective = await requireUser();

  // Same identity end-to-end = no impersonation: real admins go to /admin.
  // (This is navigation only — /admin independently re-checks requireAdmin.)
  if (effective.id === user.id && (await isPlatformAdmin(user.id))) {
    redirect("/admin");
  }

  return (
    <>
      <ImpersonationBanner />
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6">
        <h1 className="font-display text-4xl font-bold tracking-widest text-gold">
          SCRIMLY PRO
        </h1>
        <p className="text-center text-sm text-muted">
          Scrim results &amp; auto-computed standings, minutes after each
          match.
        </p>
        <Link
          href="/sessions/new"
          className="flex min-h-11 w-full items-center justify-center rounded-lg bg-gold font-display text-lg font-semibold text-bg"
        >
          Create a Scrim
        </Link>
      </main>
    </>
  );
}
