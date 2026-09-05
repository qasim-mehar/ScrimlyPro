import CreateSessionWizard from "@/components/forms/CreateSessionWizard";

export default function NewSessionPage() {
  return (
    <main className="mx-auto w-full max-w-md p-4">
      <h1 className="font-display text-3xl font-bold tracking-widest text-gold">
        New Scrim
      </h1>
      <CreateSessionWizard />
    </main>
  );
}
