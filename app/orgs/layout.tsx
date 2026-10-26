import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";

/**
 * Org surface layout (wave1(9), C-3): hosts the always-visible impersonation
 * banner on every org page. The banner is a server component validated
 * against the impersonation ledger on every render; it renders nothing for
 * normal users. In-scope org screens share the light app shell from M5.
 */
export default function OrgsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <ImpersonationBanner />
      <div className="app-shell min-h-[calc(100dvh-4rem)]">{children}</div>
    </>
  );
}
