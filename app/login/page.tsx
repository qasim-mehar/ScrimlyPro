import { LoginPanel } from "@/components/auth/login-panel";

export const metadata = { title: "Sign in — ScrimlyPro" };

/**
 * M3 (Lane C): requireUser bounces disabled tenants to /login?disabled=1.
 * The notice renders only for that explicit param and leaks nothing — the
 * user already knows their own account state. Copy is deliberately plain
 * ("Account disabled", no reason/detail per the kill-switch semantics).
 *
 * The param is read inside LoginPanel (client, in Suspense) rather than via
 * `await searchParams` here: the async page never finished its root Suspense
 * boundary, so /login rendered as a permanent loading skeleton.
 */
export default function LoginPage() {
  return <LoginPanel />;
}
