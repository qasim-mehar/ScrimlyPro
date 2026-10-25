import { AuthForm } from "@/components/auth/AuthForm";
import { Suspense } from "react";

export const metadata = { title: "New password — ScrimlyPro" };

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="font-display text-3xl font-bold tracking-widest text-gold">
        NEW PASSWORD
      </h1>
      <p className="text-sm text-muted">
        Opened from your reset link. Choose a new password.
      </p>
      <Suspense>
        <AuthForm mode="reset" />
      </Suspense>
    </main>
  );
}
