import Link from "next/link";

import { AuthShell } from "@/components/auth/AuthShell";
import { ButtonLink } from "@/components/app/ui";
import { AlertIcon } from "@/components/dashboard/icons";

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
    <AuthShell
      eyebrow="Link problem"
      title="That link didn’t work."
      description={message}
      footer={
        <p>
          Need a fresh link?{" "}
          <Link
            href="/forgot-password"
            className="font-semibold text-dash-ink underline decoration-dash-line underline-offset-4 transition-colors hover:decoration-dash-ink"
          >
            Request another
          </Link>
        </p>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2.5 rounded-dash-sm bg-dash-amber-bg px-3 py-3 text-[13px] leading-5 text-dash-amber-ink">
          <AlertIcon width="16" height="16" className="mt-0.5 shrink-0" />
          <p>
            Confirmation links are single-use and expire for your security.
            Sign-in links sent earlier may no longer work.
          </p>
        </div>
        <ButtonLink href="/login" className="w-full">
          Back to sign in
        </ButtonLink>
      </div>
    </AuthShell>
  );
}
