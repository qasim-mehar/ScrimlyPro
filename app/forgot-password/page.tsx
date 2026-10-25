import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { Suspense } from "react";

export const metadata = { title: "Forgot password — ScrimlyPro" };

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="font-display text-3xl font-bold tracking-widest text-gold">
        RESET PASSWORD
      </h1>
      <p className="text-sm text-muted">
        Enter your email and we&apos;ll send a reset link.
      </p>
      <Suspense>
        <AuthForm mode="forgot" />
      </Suspense>
      <p className="text-sm text-muted">
        <Link href="/login" className="text-gold underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
