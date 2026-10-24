import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { Suspense } from "react";

export const metadata = { title: "Sign up — ScrimlyPro" };

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="font-display text-3xl font-bold tracking-widest text-gold">
        CREATE ACCOUNT
      </h1>
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-gold underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
