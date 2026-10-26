import Link from "next/link";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Forgot password — ScrimlyPro" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account help"
      title="Reset your password."
      description="Enter the email tied to your account and we’ll send a link to choose a new password."
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
        <AuthForm mode="forgot" tone="light" />
      </Suspense>
    </AuthShell>
  );
}
