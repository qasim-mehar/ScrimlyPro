import { redirect } from "next/navigation";

import { AcceptInviteForm } from "@/components/orgs/AcceptInviteForm";
import { withUserDb } from "@/lib/db/user";
import { previewInvite } from "@/lib/orgs/invites";
import { getAuthedUser } from "@/lib/supabase/server";
import { sanitizeNextOr } from "@/lib/auth/next-url";

export const dynamic = "force-dynamic";

/**
 * /invite/[token] — public page (public-paths), server-guarded: anonymous
 * visitors are redirected to /login?next=… BEFORE anything else happens.
 * The GET renders a preview (SECURITY DEFINER org_invite_preview) and NEVER
 * mutates — acceptance is a POST server action (link/email scanners that
 * prefetch GETs cannot burn the single-use token).
 *
 * Unknown / expired / already-used tokens all render the same friendly
 * state (no existence leakage between the three).
 */
export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ used?: string }>;
}) {
  const { token } = await params;
  const { used } = await searchParams;

  const user = await getAuthedUser();
  if (!user) {
    // next is sanitized server-side (same-origin relative paths only).
    const next = sanitizeNextOr(`/invite/${token}`, "/");
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const preview = await withUserDb({ sub: user.id }, (userDb) =>
    previewInvite(userDb, token),
  );

  if (!preview) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 p-6">
        <h1 className="font-display text-2xl font-bold tracking-widest text-gold">
          Invite unavailable
        </h1>
        <p className="rounded-lg border border-line bg-surface p-4 text-sm text-muted">
          This invite link is invalid, expired, or has already been used. Ask
          an organization admin for a fresh link.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="font-display text-2xl font-bold tracking-widest text-gold">
        Join {preview.orgName}
      </h1>
      <p className="text-sm text-muted">
        You&apos;ve been invited to join{" "}
        <span className="font-semibold text-gold">{preview.orgName}</span> as{" "}
        {preview.role === "admin" ? "an admin" : "a member"}.
      </p>
      {used ? (
        <p role="alert" className="rounded-lg border border-line bg-surface p-3 text-sm text-red-400">
          This invite has already been used — if that wasn&apos;t you, ask the
          org admin what happened.
        </p>
      ) : null}
      <AcceptInviteForm token={token} />
    </main>
  );
}
