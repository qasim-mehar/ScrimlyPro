import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-display text-4xl font-bold tracking-widest text-gold">
        SCRIMLY PRO
      </p>
      <h1 className="font-display text-2xl font-semibold tracking-wide text-white">
        Page not found
      </h1>
      <p className="text-sm text-muted">
        That route does not exist in this scrim.
      </p>
      <Link
        href="/"
        className="flex min-h-11 w-full items-center justify-center rounded-lg bg-gold font-display text-lg font-semibold text-bg"
      >
        Home
      </Link>
    </main>
  );
}
