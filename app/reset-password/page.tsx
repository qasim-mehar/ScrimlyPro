import Link from "next/link";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "New password — ScrimlyPro" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="New password"
      title="Choose a new password."
      description="You opened this from your reset link. Pick something at least 8 characters long."
      footer={
        <p>
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-semibold text-dash-ink underline decoration-dash-line underline-offset-4 transition-colors hover:decoration-dash-ink"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      <Suspense>
        <AuthForm mode="reset" tone="light" />
      </Suspense>
    </AuthShell>
  );
}
