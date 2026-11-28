import Link from "next/link";

import { LogoMark } from "@/components/dashboard/icons";

export const metadata = { title: "Terms and Conditions — ScrimlyPro" };

/**
 * Public legal copy for the signup gate. No commercial claims, prices, or
 * customer stories — the product has no payments or pilot data yet.
 */
const SECTIONS = [
  {
    title: "1. Acceptance",
    body: [
      "By creating an account or using ScrimlyPro, you agree to these terms. If you do not agree, do not create an account or use the service.",
      "These terms apply to the website, the screenshot-to-standings flow, and any graphics or share links produced by ScrimlyPro.",
    ],
  },
  {
    title: "2. Your account",
    body: [
      "You are responsible for the email address and password you use, and for activity that happens under your account.",
      "Accounts are for individual scrim organizers. Organizations, invitations, and roles exist to separate your own work; they are not a licence to use someone else's account.",
    ],
  },
  {
    title: "3. Acceptable use",
    body: [
      "Use ScrimlyPro only for results you are entitled to publish. Do not upload material you do not have permission to use, or use the service to harass, impersonate, or mislead others.",
      "Do not attempt to bypass rate limits, access controls, tenancy boundaries, or other users' sessions and data.",
    ],
  },
  {
    title: "4. Uploaded screenshots and OCR",
    body: [
      "You upload end-of-match screenshots so ScrimlyPro can read placements, player names, and elimination counts. Raw images are processed to produce a draft and are not kept after that draft is stored.",
      "The engine only suggests team mappings. You confirm every mapping and every result before it contributes to standings. Check the review screen carefully: you are responsible for the numbers you confirm.",
    ],
  },
  {
    title: "5. Standings, MVP lists, and graphics",
    body: [
      "Standings are always derived from confirmed match results; they are never stored as separate totals. You can unlock and correct a confirmed match, which recomputes everything downstream.",
      "The Top-5 MVP graphic is rendered only from the list you lock. Share links give read-only access to public standings and can be revoked by the organizer who created them.",
    ],
  },
  {
    title: "6. Third-party services",
    body: [
      "Screenshot reading uses a third-party AI service. By using the OCR flow you agree that the uploaded images may be sent to that provider for processing.",
      "Authentication and hosting are provided by third-party infrastructure. Availability depends on those services as well as ScrimlyPro itself.",
    ],
  },
  {
    title: "7. Ownership",
    body: [
      "You keep ownership of the screenshots you upload and the results you enter. ScrimlyPro and its design, code, and trademarks remain the property of the ScrimlyPro project.",
      "The scrimlypro.com watermark is rendered on exported graphics. You may share the graphics you create; you may not present the service itself as your own product.",
    ],
  },
  {
    title: "8. Availability and changes",
    body: [
      "ScrimlyPro is provided as-is. Features may change, be added, or be removed. We aim to keep confirmed data intact, but you should export graphics you want to keep.",
      "We may update these terms. Continuing to use ScrimlyPro after an update means you accept the revised terms.",
    ],
  },
  {
    title: "9. Termination",
    body: [
      "You can stop using ScrimlyPro at any time. An account may be disabled if these terms are breached or if it is required to protect other users or the service.",
    ],
  },
  {
    title: "10. Contact",
    body: [
      "Questions about these terms can be raised through the support channel available in the app. This page is the authoritative copy of the terms shown at signup.",
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <main className="app-shell min-h-dvh">
      <div className="mx-auto w-full max-w-[760px] px-5 py-12 sm:px-8 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[15px] font-bold tracking-[-0.01em] text-dash-ink"
        >
          <span className="flex size-8 items-center justify-center rounded-[9px] bg-dash-ink text-white">
            <LogoMark width="17" height="17" />
          </span>
          ScrimlyPro
        </Link>

        <h1 className="mt-10 text-balance text-[32px] leading-[1.1] font-bold tracking-[-0.03em] text-dash-ink sm:text-[40px]">
          Terms and Conditions
        </h1>
        <p className="mt-2 text-sm text-dash-ink3">Last updated: 27 November 2026</p>
        <p className="mt-6 max-w-[68ch] text-[15px] leading-7 text-dash-ink2">
          These terms explain what ScrimlyPro does with your account, your
          screenshots, and the graphics you create. They are the terms linked
          from the account creation form.
        </p>

        <div className="mt-10 flex flex-col gap-9">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-[18px] font-bold tracking-[-0.02em] text-dash-ink">
                {section.title}
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="max-w-[68ch] text-[14px] leading-7 text-dash-ink2"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-dash-line pt-6 text-[13px] text-dash-ink3">
          <Link href="/signup" className="font-semibold text-dash-ink underline underline-offset-4">
            Back to sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
