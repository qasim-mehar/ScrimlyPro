import { withUserDb } from "@/lib/db/user";
import { listInvites } from "@/lib/orgs/invites";
import { getOrgQuota } from "@/lib/orgs/quotas";
import { listMembers, requireOrgRole, roleAtLeast } from "@/lib/orgs/roles";
import { InviteForm } from "@/components/orgs/InviteForm";
import {
  RemoveMemberButton,
  RevokeInviteButton,
} from "@/components/orgs/MemberActions";
import { QuotaBanner } from "@/components/orgs/QuotaBanner";

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

  const [members, invites, quota] = await withUserDb(
    { sub: user.id },
    async (userDb) => {
      const [m, i, q] = await Promise.all([
        listMembers(userDb, id),
        isAdmin ? listInvites(userDb, id) : Promise.resolve([]),
        getOrgQuota(userDb, id),
      ]);
      return [m, i, q] as const;
    },
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold tracking-widest text-gold">
          Organization
        </h1>
        <p className="text-sm text-muted">
          You are {ROLE_LABEL[role]?.toLowerCase() ?? role} ·{" "}
          {members.length} member{members.length === 1 ? "" : "s"}
        </p>
      </header>

      <QuotaBanner
        maxSessions={quota.maxSessions}
        monthlyOcrCalls={quota.monthlyOcrCalls}
      />

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold text-gold">Members</h2>
        <ul className="flex flex-col gap-2">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {ROLE_LABEL[member.role] ?? member.role}
                  {member.userId === user.id ? " (you)" : ""}
                </p>
                <p className="truncate text-xs text-muted">
                  joined {member.joinedAt.slice(0, 10)} · {shortId(member.userId)}
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
          ))}
        </ul>
        {isAdmin ? (
          <p className="text-xs text-muted">
            An organization always keeps at least one owner — promote another
            member to owner before removing the last one.
          </p>
        ) : null}
      </section>

      {isAdmin ? (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-semibold text-gold">
              Invite a member
            </h2>
            <InviteForm orgId={id} />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-display text-xl font-semibold text-gold">
              Pending invites
            </h2>
            {invites.length === 0 ? (
              <p className="text-sm text-muted">No pending invites.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {invites.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {ROLE_LABEL[invite.role] ?? invite.role}
                        {invite.email ? ` · ${invite.email}` : ""}
                      </p>
                      <p className="text-xs text-muted">
                        {invite.acceptedAt
                          ? `accepted ${invite.acceptedAt.slice(0, 10)}`
                          : `expires ${invite.expiresAt.slice(0, 10)}`}
                      </p>
                    </div>
                    {invite.acceptedAt ? null : (
                      <RevokeInviteButton orgId={id} inviteId={invite.id} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
