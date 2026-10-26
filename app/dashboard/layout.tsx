import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";

/**
 * Tenant surface layout (M3 convention, mirrors app/sessions/layout.tsx):
 * hosts the always-visible impersonation banner over the M5 dashboard shell.
 * The banner is a server component validated against the impersonation
 * ledger on every render; it renders nothing for normal users.
 */
export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="dash-shell min-h-dvh">
      <ImpersonationBanner />
      {children}
    </div>
  );
}
