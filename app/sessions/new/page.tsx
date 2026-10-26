import CreateSessionWizard from "@/components/forms/CreateSessionWizard";
import { PageHeader } from "@/components/app/ui";
import { requireUser } from "@/lib/auth/action-guard";
import { withUserDb } from "@/lib/db/user";
import { ensurePersonalOrg, getActiveOrgs } from "@/lib/orgs/orgs";

/**
 * WP6: authenticated users only (defense in depth — createSessionAction
 * re-verifies via requireUser before any write).
 *
 * M2: the wizard needs the user's orgs (server-loaded under withUserDb; a
 * user with none gets their Personal org bootstrapped here). The selection
 * is re-verified server-side on submit — the client list is convenience,
 * never authorization.
 */
export default async function NewSessionPage() {
  const user = await requireUser();
  const orgs = await withUserDb({ sub: user.id }, async (userDb) => {
    await ensurePersonalOrg(userDb, user.id);
    return getActiveOrgs(userDb, user.id);
  });

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        title="New scrim"
        description="Set the format, add the teams, and ScrimlyPro will turn each screenshot into confirmed standings."
      />
      <CreateSessionWizard orgs={orgs} />
    </main>
  );
}
