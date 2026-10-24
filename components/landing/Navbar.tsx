import Link from "next/link";
import { Redo2 } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", href: "#" },
  { label: "Socials", href: "#socials" },
  { label: "Comparison", href: "#comparison" },
] as const;

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav
        aria-label="Main"
        className="relative mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 md:h-20"
      >
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight text-white"
        >
          bear<span className="text-[#FFD23F]">.io</span>
        </Link>

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1.5 backdrop-blur-md md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="group flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm text-white/70 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white"
            >
              <Redo2
                aria-hidden
                className="size-3.5 text-white/40 transition-colors duration-200 group-hover:text-[#FFD23F]"
              />
              {label}
            </Link>
          ))}
        </div>

        <Link
          href="#book"
          className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-all duration-200 hover:bg-[#FFD23F] hover:shadow-[0_0_24px_rgba(255,210,63,0.35)]"
        >
          Book a Call
        </Link>
      </nav>
    </header>
  );
}
