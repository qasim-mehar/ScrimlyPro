import { CreateOrgForm } from "@/components/orgs/CreateOrgForm";
import { requireUser } from "@/lib/auth/action-guard";

/**
 * /orgs/new — authenticated only (createOrgAction re-verifies and scopes
 * everything server-side under withUserDb).
 */
export default async function NewOrgPage() {
  await requireUser();

  return (
    <main className="mx-auto w-full max-w-md p-4">
      <h1 className="font-display text-3xl font-bold tracking-widest text-gold">
        New Organization
      </h1>
      <p className="mt-2 text-sm text-muted">
        An organization holds your members, scrims, and monthly limits.
      </p>
      <CreateOrgForm />
    </main>
  );
}
