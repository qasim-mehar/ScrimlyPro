import CreateSessionWizard from "@/components/forms/CreateSessionWizard";
import { requireUser } from "@/lib/auth/action-guard";

/**
 * WP6: authenticated users only (defense in depth — createSessionAction
 * re-verifies via requireUser before any write).
 */
export default async function NewSessionPage() {
  await requireUser();

  return (
    <main className="mx-auto w-full max-w-md p-4">
      <h1 className="font-display text-3xl font-bold tracking-widest text-gold">
        New Scrim
      </h1>
      <CreateSessionWizard />
    </main>
  );
}
