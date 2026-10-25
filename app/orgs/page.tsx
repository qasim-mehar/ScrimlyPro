import Link from "next/link";

import { requireUser } from "@/lib/auth/action-guard";
import { withUserDb } from "@/lib/db/user";
import { getActiveOrgs } from "@/lib/orgs/orgs";

export const dynamic = "force-dynamic";

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
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <h1 className="font-display text-3xl font-bold tracking-widest text-gold">
        Organizations
      </h1>
      {orgs.length === 0 ? (
        <p className="text-sm text-muted">
          You&apos;re not in any organization yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {orgs.map((org) => (
            <li key={org.id}>
              <Link
                href={`/orgs/${org.id}`}
                className="flex min-h-[44px] items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:border-gold"
              >
                <span className="truncate">{org.name}</span>
                <span className="text-xs font-normal tracking-widest text-muted">
                  {org.role.toUpperCase()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/orgs/new"
        className="flex min-h-11 items-center justify-center rounded-lg bg-gold font-display text-lg font-semibold text-bg"
      >
        New Organization
      </Link>
    </main>
  );
}
