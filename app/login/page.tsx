import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { Suspense } from "react";

export const metadata = { title: "Sign in — ScrimlyPro" };

/**
 * M3 (Lane C): requireUser bounces disabled tenants to /login?disabled=1.
 * The notice renders only for that explicit param and leaks nothing — the
 * user already knows their own account state. Copy is deliberately plain
 * ("Account disabled", no reason/detail per the kill-switch semantics).
 */
async function DisabledNotice({
  searchParams,
}: {
  searchParams: Promise<{ disabled?: string }>;
}) {
  const { disabled } = await searchParams;
  if (!disabled) return null;
  return (
    <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
      Account disabled. Contact support if you believe this is a mistake.
    </p>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ disabled?: string }>;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="font-display text-3xl font-bold tracking-widest text-gold">
        SIGN IN
      </h1>
      <Suspense>
        <DisabledNotice searchParams={searchParams} />
      </Suspense>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
      <div className="flex flex-col gap-1 text-sm text-muted">
        <p>
          No account?{" "}
          <Link href="/signup" className="text-gold underline">
            Sign up
          </Link>
        </p>
        <p>
          <Link href="/forgot-password" className="text-gold underline">
            Forgot your password?
          </Link>
        </p>
      </div>
    </main>
  );
}
