import Link from "next/link";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Sign up — ScrimlyPro" };

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Create account"
      title="Get your crew on the board."
      description="Start with one scrim. Upload the results, confirm the read, and share the standings."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-dash-ink underline decoration-dash-line underline-offset-4 transition-colors hover:decoration-dash-ink"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <Suspense>
        <AuthForm mode="signup" tone="light" />
      </Suspense>
    </AuthShell>
  );
}
