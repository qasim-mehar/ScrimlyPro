import Link from "next/link";

export const metadata = { title: "Auth error — ScrimlyPro" };

const REASONS: Record<string, string> = {
  missing_code: "The confirmation link was incomplete.",
  exchange_failed: "The confirmation link has expired or was already used.",
  unexpected: "Something went wrong confirming the link.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const message = (reason && REASONS[reason]) || REASONS.unexpected;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="font-display text-3xl font-bold tracking-widest text-gold">
        LINK PROBLEM
      </h1>
      <p className="text-sm text-muted">{message}</p>
      <Link
        href="/login"
        className="flex min-h-11 w-full items-center justify-center rounded-lg bg-gold font-display text-lg font-semibold text-bg"
      >
        Back to sign in
      </Link>
    </main>
  );
}
