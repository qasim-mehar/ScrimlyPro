import Link from "next/link";

import { requireUser } from "@/lib/auth/action-guard";
import { withUserDb } from "@/lib/db/user";
import { getActiveOrgs } from "@/lib/orgs/orgs";
import {
  ButtonLink,
  EmptyState,
  PageHeader,
  StatusChip,
} from "@/components/app/ui";
import { ArrowUpRightIcon, PlusIcon, UsersIcon } from "@/components/dashboard/icons";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

/**
 * /orgs — the user's organizations (server-loaded under withUserDb).
 * Navigation home for the org badge in the header.
 */
export default async function OrgsPage() {
  const user = await requireUser();
  const orgs = await withUserDb({ sub: user.id }, (userDb) =>
    getActiveOrgs(userDb, user.id),
  );

  return (
    <main className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="Organizations"
        description="Every scrim belongs to an organization. Switch between the crews you belong to, or start a new one."
        actions={
          <ButtonLink href="/orgs/new">
            <PlusIcon width="16" height="16" />
            New organization
          </ButtonLink>
        }
      />

      {orgs.length === 0 ? (
        <EmptyState
          icon={<UsersIcon width="22" height="22" />}
          title="No organizations yet"
          description="Create your first organization to hold members, scrims, and shared plan limits."
          action={<ButtonLink href="/orgs/new">Create organization</ButtonLink>}
          className="mt-6 bg-dash-surface py-12"
        />
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {orgs.map((org) => (
            <li key={org.id}>
              <Link
                href={`/orgs/${org.id}`}
                className="group flex min-h-[88px] items-center gap-3 rounded-dash bg-dash-surface p-4 transition-colors hover:bg-dash-subtle"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-dash-sm bg-dash-bg text-base font-bold text-dash-ink">
                  {org.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-dash-ink">
                    {org.name}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-dash-ink3">
                    {ROLE_LABEL[org.role] ?? org.role}
                  </span>
                </span>
                <span className="hidden sm:block">
                  <StatusChip tone={org.role === "owner" ? "live" : "neutral"}>
                    {ROLE_LABEL[org.role] ?? org.role}
                  </StatusChip>
                </span>
                <ArrowUpRightIcon
                  width="17"
                  height="17"
                  className="shrink-0 text-dash-ink4 transition-colors group-hover:text-dash-ink"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 flex items-start gap-2 text-[12px] leading-5 text-dash-ink3">
        <UsersIcon width="14" height="14" className="mt-0.5 shrink-0" />
        Membership is per organization. Ask an owner or admin for an invite
        link if you need access to another crew.
      </p>
    </main>
  );
}
