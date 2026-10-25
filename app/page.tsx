// entry point — session list/history arrives with C4.2+
import Link from "next/link";

import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import BenefitsSection from "@/components/landing/BenefitsSection";
import Hero from "@/components/landing/Hero";
import ReserveSection from "@/components/reserve-section";
import SiteFooter from "@/components/site-footer";
import { requireUser } from "@/lib/auth/action-guard";
import { getAuthedUser } from "@/lib/supabase/server";

/**
 * Public marketing landing (landing-page branch). "/" is on PUBLIC_PAGES, so
 * the proxy lets anonymous visitors through here instead of bouncing them to
 * /login; the copy is the contributor's, still unwritten for ScrimlyPro.
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
 * WP6: authenticated users only (the proxy gates too — this is defense in
 * depth). No tenant data is rendered yet; listRecentSessions lands with
 * C4.2+ and MUST run under withUserDb with an explicit
 * eq(sessions.userId, user.id) predicate when it arrives.
 */
export default async function Home() {
  // Signed-out visitors see the landing page, tenants see their home.
  const user = await getAuthedUser();
  if (!user) return <LandingPage />;

  await requireUser();

  return (
    <>
      <ImpersonationBanner />
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6">
        <h1 className="font-display text-4xl font-bold tracking-widest text-gold">
          SCRIMLY PRO
        </h1>
        <p className="text-center text-sm text-muted">
          Scrim results, standings & MVP graphics — in minutes.
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
