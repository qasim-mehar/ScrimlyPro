import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { Suspense } from "react";

export const metadata = { title: "Sign in — ScrimlyPro" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="font-display text-3xl font-bold tracking-widest text-gold">
        SIGN IN
      </h1>
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
