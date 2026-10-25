import type { Metadata } from "next";
import { Inter, Inter_Tight, Lexend } from "next/font/google";

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

/* Landing-page typefaces (landing-page branch): exposed on <body> as CSS
   variables for components/landing/* and the reserve/footer sections.
   The authenticated surface keeps its own face via @theme --font-display. */
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter-tight",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-lexend",
});

export const metadata: Metadata = {
  title: "ScrimlyPro",
  description: "Scrim results, standings & MVP graphics for organizers.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${interTight.variable} ${inter.variable} ${lexend.variable}`}
      >
        <AccountHeader />
        {children}
      </body>
    </html>
  );
}
