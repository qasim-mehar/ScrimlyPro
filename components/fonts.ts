import { Inter, Source_Serif_4, Yellowtail } from "next/font/google";

/**
 * Shared font declarations for the reserve section and site footer.
 * Inter and Source Serif 4 are variable fonts, so omitting `weight`
 * exposes the full axis (the headline uses 560). Yellowtail only
 * ships 400.
 */
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const yellowtail = Yellowtail({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-logo",
  display: "swap",
});
