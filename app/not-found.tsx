import Link from "next/link";

import { ButtonLink } from "@/components/app/ui";
import { LogoMark } from "@/components/dashboard/icons";

export default function NotFound() {
  return (
    <main className="app-shell flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <Link
          href="/"
          className="mx-auto flex w-fit items-center gap-2 text-[15px] font-bold tracking-[-0.01em] text-dash-ink"
        >
          <span className="flex size-8 items-center justify-center rounded-[9px] bg-dash-ink text-white">
            <LogoMark width="17" height="17" />
          </span>
          ScrimlyPro
        </Link>

        <section className="mt-5 rounded-dash-lg bg-dash-surface p-6 text-center sm:p-8">
          <p className="mx-auto flex size-14 items-center justify-center rounded-dash bg-dash-lime text-xl font-bold tabular-nums text-dash-ink">
            404
          </p>
          <h1 className="mt-4 text-balance text-2xl font-bold tracking-[-0.025em] text-dash-ink sm:text-3xl">
            This page isn&apos;t in the lobby.
          </h1>
          <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-6 text-dash-ink3">
            The route doesn&apos;t exist, or it belongs to a scrim you
            don&apos;t have access to. Either way, there&apos;s nothing to read
            here.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <ButtonLink href="/">Back to home</ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary">
              Open dashboard
            </ButtonLink>
          </div>
        </section>

        <p className="mt-4 text-center text-[12px] leading-5 text-dash-ink4">
          Missing foreign orgs and scrims look exactly like this — access is
          never confirmed.
        </p>
      </div>
    </main>
  );
}
