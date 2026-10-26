import { eq } from "drizzle-orm";

import { withUserDb } from "@/lib/db/user";
import { organizations } from "@/lib/db/schema";
import { listInvites } from "@/lib/orgs/invites";
import { getOrgQuota } from "@/lib/orgs/quotas";
import { listMembers, requireOrgRole, roleAtLeast } from "@/lib/orgs/roles";
import { InviteForm } from "@/components/orgs/InviteForm";
import {
  RemoveMemberButton,
  RevokeInviteButton,
} from "@/components/orgs/MemberActions";
import { QuotaBanner } from "@/components/orgs/QuotaBanner";
import {
  PageHeader,
  SectionHeading,
  StatusChip,
} from "@/components/app/ui";
import { AlertIcon, LinkIcon, UsersIcon } from "@/components/dashboard/icons";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

function shortId(id: string): string {
  return id.slice(0, 8);
}

/**
 * /orgs/[id] — members + invites management. requireOrgRole is the guard:
 * verified identity + DB-checked membership (member+ to view, admin+ for
 * the invite form and mutations). Foreign/missing orgs render 404.
 */
export default async function OrgMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, role } = await requireOrgRole(id, "member");
  const isAdmin = roleAtLeast(role, "admin");

  const [members, invites, quota, org] = await withUserDb(
    { sub: user.id },
    async (userDb) => {
      const [m, i, q, o] = await Promise.all([
        listMembers(userDb, id),
        isAdmin ? listInvites(userDb, id) : Promise.resolve([]),
        getOrgQuota(userDb, id),
        userDb
          .select({ id: organizations.id, name: organizations.name })
          .from(organizations)
          .where(eq(organizations.id, id))
          .limit(1),
      ]);
      return [m, i, q, o[0] ?? null] as const;
    },
  );

  const pendingInvites = invites.filter((invite) => !invite.acceptedAt);

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        backHref="/orgs"
        backLabel="Organizations"
        title={org?.name ?? "Organization"}
        description={`You are ${(ROLE_LABEL[role] ?? role).toLowerCase()} here · ${
          members.length
        } member${members.length === 1 ? "" : "s"}`}
        badges={
          <>
            <StatusChip tone={role === "owner" ? "live" : "neutral"}>
              {ROLE_LABEL[role] ?? role}
            </StatusChip>
            <StatusChip>
              {members.length} member{members.length === 1 ? "" : "s"}
            </StatusChip>
          </>
        }
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex flex-col gap-4">
          <section className="rounded-dash-lg bg-dash-surface p-5 sm:p-6">
            <SectionHeading
              title="Members"
              description="Everyone with access to this organization's scrims."
              action={
                <StatusChip>
                  {members.length} total
                </StatusChip>
              }
            />

            <ul className="mt-4 divide-y divide-dash-bg">
              {members.map((member) => {
                const isYou = member.userId === user.id;
                return (
                  <li
                    key={member.userId}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-dash-bg text-[11px] font-bold text-dash-ink2">
                      {(ROLE_LABEL[member.role] ?? member.role)
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold text-dash-ink">
                        {ROLE_LABEL[member.role] ?? member.role}
                        {isYou ? (
                          <span className="rounded-[4px] bg-dash-bg px-1.5 py-0.5 text-[10px] font-semibold text-dash-ink3">
                            you
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-[12px] text-dash-ink3">
                        Joined {member.joinedAt.slice(0, 10)} ·{" "}
                        <span className="font-mono">{shortId(member.userId)}</span>
                      </p>
                    </div>
                    {isAdmin && member.role !== "owner" ? (
                      <RemoveMemberButton
                        orgId={id}
                        userId={member.userId}
                        label="Remove"
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>

            {isAdmin ? (
              <p className="mt-4 flex items-start gap-2 rounded-dash-sm bg-dash-bg px-3 py-2.5 text-[12px] leading-5 text-dash-ink3">
                <AlertIcon width="14" height="14" className="mt-0.5 shrink-0" />
                An organization always keeps at least one owner. Promote
                another member before removing the last one.
              </p>
            ) : null}
          </section>

          {isAdmin ? (
            <section className="rounded-dash-lg bg-dash-surface p-5 sm:p-6">
              <SectionHeading
                title="Pending invites"
                description="Single-use links that haven't been accepted yet."
                action={<StatusChip>{pendingInvites.length} pending</StatusChip>}
              />

              {invites.length === 0 ? (
                <div className="mt-4 flex flex-col items-center rounded-dash-sm bg-dash-bg px-4 py-8 text-center">
                  <span className="flex size-10 items-center justify-center rounded-full bg-dash-surface text-dash-ink2">
                    <LinkIcon width="18" height="18" />
                  </span>
                  <p className="mt-2.5 text-sm font-semibold text-dash-ink">
                    No pending invites
                  </p>
                  <p className="mt-0.5 max-w-[38ch] text-[12px] leading-5 text-dash-ink3">
                    Create a link in the panel on the right and send it to the
                    person you want to add.
                  </p>
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-dash-bg">
                  {invites.map((invite) => (
                    <li
                      key={invite.id}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-dash-bg text-dash-ink2">
                        <LinkIcon width="16" height="16" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-dash-ink">
                          {ROLE_LABEL[invite.role] ?? invite.role}
                          {invite.email ? (
                            <span className="font-normal text-dash-ink3">
                              {" "}
                              · {invite.email}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[12px] text-dash-ink3">
                          {invite.acceptedAt
                            ? `Accepted ${invite.acceptedAt.slice(0, 10)}`
                            : `Expires ${invite.expiresAt.slice(0, 10)}`}
                        </p>
                      </div>
                      {invite.acceptedAt ? (
                        <StatusChip tone="live">Accepted</StatusChip>
                      ) : (
                        <RevokeInviteButton orgId={id} inviteId={invite.id} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <QuotaBanner
            maxSessions={quota.maxSessions}
            monthlyOcrCalls={quota.monthlyOcrCalls}
          />

          {isAdmin ? (
            <section className="rounded-dash-lg bg-dash-surface p-5">
              <SectionHeading
                title="Invite by link"
                description="The link is shown once, works once, and expires in 7 days."
              />
              <div className="mt-4">
                <InviteForm orgId={id} />
              </div>
            </section>
          ) : null}

          <section className="rounded-dash bg-dash-surface p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-dash-ink">
              <UsersIcon width="17" height="17" className="text-dash-ink3" />
              Roles
            </h2>
            <dl className="mt-3 flex flex-col gap-2.5 text-[13px] leading-5">
              <div>
                <dt className="font-semibold text-dash-ink">Owner</dt>
                <dd className="text-dash-ink3">
                  Full access, including members and invites. At least one must
                  remain.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-dash-ink">Admin</dt>
                <dd className="text-dash-ink3">
                  Manages members, invites, and every scrim in the org.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-dash-ink">Member</dt>
                <dd className="text-dash-ink3">
                  Works on the org&apos;s scrims without managing access.
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </main>
  );
}
