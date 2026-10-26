import Link from "next/link";
import { redirect } from "next/navigation";

import { AcceptInviteForm } from "@/components/orgs/AcceptInviteForm";
import { withUserDb } from "@/lib/db/user";
import { previewInvite } from "@/lib/orgs/invites";
import { getAuthedUser } from "@/lib/supabase/server";
import { sanitizeNextOr } from "@/lib/auth/next-url";
import { ButtonLink, StatusChip } from "@/components/app/ui";
import { AlertIcon, LogoMark, UsersIcon } from "@/components/dashboard/icons";
import { CheckIcon } from "@/components/app/icons";

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

  return (
    <main className="app-shell min-h-dvh">
      <header className="border-b border-dash-line bg-dash-surface">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[14px] font-bold tracking-[-0.01em] text-dash-ink"
          >
            <span className="flex size-7 items-center justify-center rounded-[8px] bg-dash-ink text-white">
              <LogoMark width="15" height="15" />
            </span>
            ScrimlyPro
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-dash-chip bg-dash-bg px-2.5 py-1 text-[11px] font-semibold text-dash-ink2">
            <UsersIcon width="13" height="13" />
            Organization invite
          </span>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100dvh-57px)] w-full max-w-[560px] flex-col justify-center px-4 py-10 sm:px-6">
        {!preview ? (
          <section className="rounded-dash-lg bg-dash-surface p-6 text-center sm:p-8">
            <span className="mx-auto flex size-12 items-center justify-center rounded-dash bg-dash-amber-bg text-dash-amber-ink">
              <AlertIcon width="22" height="22" />
            </span>
            <p className="mt-4 text-[11px] font-semibold tracking-wide text-dash-ink3 uppercase">
              Invite unavailable
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-dash-ink">
              This link can’t be used.
            </h1>
            <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-6 text-dash-ink3">
              It&apos;s invalid, expired, or has already been used. Ask an
              organization admin for a fresh invite link.
            </p>
            <ButtonLink href="/dashboard" className="mt-5">
              Go to dashboard
            </ButtonLink>
          </section>
        ) : (
          <section className="overflow-hidden rounded-dash-lg bg-dash-surface">
            <div className="relative overflow-hidden bg-dash-ink p-6 text-white sm:p-7">
              <div aria-hidden="true" className="app-grid absolute inset-0" />
              <div className="relative">
                <p className="text-[11px] font-semibold tracking-wide text-dash-lime uppercase">
                  You&apos;re invited
                </p>
                <h1 className="mt-2 flex items-center gap-3 text-balance text-[26px] leading-[1.15] font-bold tracking-[-0.025em]">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-dash-sm bg-white/10 text-lg font-bold">
                    {preview.orgName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 break-words">{preview.orgName}</span>
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusChip tone="live">
                    {preview.role === "admin" ? "Admin access" : "Member access"}
                  </StatusChip>
                  <span className="text-[12px] text-white/50">
                    Single-use invite
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-7">
              <p className="text-sm leading-6 text-dash-ink2">
                Joining adds you to{" "}
                <span className="font-semibold text-dash-ink">
                  {preview.orgName}
                </span>{" "}
                as {preview.role === "admin" ? "an admin" : "a member"}. You’ll
                be able to see and work on this organization’s scrims.
              </p>

              <ul className="mt-4 flex flex-col gap-2.5">
                {[
                  preview.role === "admin"
                    ? "Manage members, invites, and every scrim."
                    : "Work on the crew’s scrims without managing access.",
                  "Your existing organizations stay exactly as they are.",
                  "An owner or admin controls who has access to the org.",
                ].map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-2 text-[13px] leading-5 text-dash-ink3"
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-dash-lime text-dash-ink">
                      <CheckIcon width="12" height="12" />
                    </span>
                    {line}
                  </li>
                ))}
              </ul>

              {used ? (
                <p
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-dash-sm bg-dash-danger-bg px-3 py-2.5 text-[13px] leading-5 text-dash-danger-ink"
                >
                  <AlertIcon width="15" height="15" className="mt-0.5 shrink-0" />
                  This invite has already been used — if that wasn’t you, ask
                  the org admin what happened.
                </p>
              ) : null}

              <div className="mt-5">
                <AcceptInviteForm token={token} />
              </div>

              <p className="mt-4 text-center text-[12px] leading-5 text-dash-ink3">
                Not now?{" "}
                <Link
                  href="/dashboard"
                  className="font-semibold text-dash-ink underline decoration-dash-line underline-offset-4 hover:decoration-dash-ink"
                >
                  Return to the dashboard
                </Link>
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
