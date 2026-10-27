import { LoginPanel } from "@/components/auth/login-panel";

export const metadata = { title: "Sign in — ScrimlyPro" };

/**
 * M3 (Lane C): requireUser bounces disabled tenants to /login?disabled=1.
 * The notice renders only for that explicit param and leaks nothing — the
 * user already knows their own account state. Copy is deliberately plain
 * ("Account disabled", no reason/detail per the kill-switch semantics).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ disabled?: string }>;
}) {
  const { disabled } = await searchParams;
  return (
    <LoginPanel
      disabledNotice={
        disabled
          ? "Account disabled. Contact support if you believe this is a mistake."
          : null
      }
    />
  );
}
