import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/action-guard";

import type { StandingRow } from "@/lib/scoring";
import { CalibrateClient } from "./CalibrateClient";

export const dynamic = "force-dynamic";

const NAMES = [
  "TF Squad",
  "Straight Forward",
  "Bawa Qadra",
  "TRB HANAN",
  "4NM BROKEN",
  "ROX Gaming",
  "CRUSH Esports",
  "AKM Dasim",
  "Zero Degree Esports",
  "Voltage Esports",
  "NMS TITANIUM",
  "VORTEX ESPORTS",
  "HYDRA OPS PAK",
  "KARACHI KINGS",
  "GODLIKE PAK",
  "NX GAMING",
  "SCARYMONSTA XR",
  "DRAGO KNIGHTS",
  "SRT SHADOW",
  "RAWALPINDI RHINOS",
  "THE LAST RIDERZ",
  "OFFICIAL AGENT 47",
  "TEAM SANSATIONAL",
  "HANAN OP SQUAD",
  "NIGHT OWLS PK",
];

/** 44px-style dummy logo: initial on a dark chip (data URL, no assets). */
function dummyLogo(name: string): string {
  const initial = name.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "TM";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44">` +
    `<rect width="44" height="44" rx="8" fill="#0e7ac4"/>` +
    `<text x="22" y="29" font-family="sans-serif" font-size="20" font-weight="bold" ` +
    `fill="#ffffff" text-anchor="middle">${initial}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function dataset(n: number): StandingRow[] {
  return NAMES.slice(0, n).map((teamName, i) => {
    const total = 120 - i * 4;
    const wwcd = i === 0 ? 2 : i < 4 ? 1 : 0;
    const kp = 34 - Math.floor(i / 2);
    return {
      teamId: `cal-${i}`,
      teamName,
      logoUrl: dummyLogo(teamName),
      wwcd,
      matches: 6,
      pp: total - kp - wwcd * 10,
      kp,
      total,
    };
  });
}

export default async function CalibratePage() {
  if (process.env.NODE_ENV === "production") notFound();
  // WP6: authenticated users only (dev pages render fixtures; no tenant reads).
  await requireUser();
  return (
    <main className="mx-auto max-w-6xl p-4">
      <h1 className="text-xl font-bold tracking-widest text-gold">STANDINGS CALIBRATION</h1>
      <p className="mt-1 text-sm text-muted">
        Dev route. Dummy standings at 16 / 19 / 24 / 25 teams over each template&apos;s art, 100px grid above it,
        live config readout beside it.
      </p>
      <div className="mt-4">
        <CalibrateClient
          datasets={{ 16: dataset(16), 19: dataset(19), 24: dataset(24), 25: dataset(25) }}
        />
      </div>
    </main>
  );
}
