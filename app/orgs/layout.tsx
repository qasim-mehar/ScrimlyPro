import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";

/**
 * Org surface layout (wave1(9), C-3): hosts the always-visible impersonation
 * banner on every org page. The banner is a server component validated
 * against the impersonation ledger on every render; it renders nothing for
 * normal users.
 */
export default function OrgsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <ImpersonationBanner />
      {children}
    </>
  );
}
