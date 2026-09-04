import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
