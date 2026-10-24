import type { Metadata } from "next";
import { AccountHeader } from "@/components/auth/AccountHeader";
import "@fontsource/exo-2/500.css";
import "@fontsource/exo-2/600.css";
import "@fontsource/exo-2/700.css";
import "@fontsource/exo-2/800.css";
// Rajdhani stays loaded as the fallback face in every font stack (P7).
import "@fontsource/rajdhani/500.css";
import "@fontsource/rajdhani/600.css";
import "@fontsource/rajdhani/700.css";
import "@fontsource/noto-sans-symbols-2/index.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScrimlyPro",
  description: "Scrim results, standings & MVP graphics for organizers.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AccountHeader />
        {children}
      </body>
    </html>
  );
}
