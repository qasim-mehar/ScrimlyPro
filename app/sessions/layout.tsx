import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";

/**
 * Tenant surface layout (M3): hosts the always-visible impersonation
 * banner. The banner is a server component validated against the
 * impersonation ledger on every render; it renders nothing for normal
 * users.
 */
export default function SessionsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <ImpersonationBanner />
      {children}
    </>
  );
}
