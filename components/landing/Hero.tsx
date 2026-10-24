import { ArrowUpRight, Phone, Sparkles } from "lucide-react";

const CHIPS = [
  { label: "Portfolio", color: "bg-[#22C55E]" },
  { label: "Achievements", color: "bg-[#3B82F6]" },
  { label: "Client's Feedback", color: "bg-[#FACC15]" },
  { label: "FAQ", color: "bg-[#EF4444]" },
] as const;

export default function Hero() {
  return (
    <main className="min-h-screen">
      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6">
        <div className="flex flex-1 flex-col justify-center pb-16 pt-28 md:pt-32">
          {/* Eyebrow */}
          <div
            className="hero-fade flex items-center gap-2"
            style={{ animationDelay: "0.05s" }}
          >
            <Sparkles aria-hidden className="size-4 text-[#FFD23F]" />
            <span className="text-sm text-white/60">Design Wizard</span>
          </div>

          {/* Headline */}
          <h1
            className="hero-fade mt-5 font-display text-[clamp(3.4rem,9vw,8rem)] font-bold leading-[1.0] tracking-[-0.035em] text-white"
            style={{ animationDelay: "0.15s" }}
          >
            I craft <span className="transition-colors duration-300 hover:text-[#22C55E]">Ideas</span>
            <br />
            through{" "}
            <span className="transition-colors duration-300 hover:text-[#FFD23F]">Design</span>
          </h1>

          {/* Subline */}
          <p
            className="hero-fade mt-6 max-w-xl text-base leading-relaxed text-white/60 md:text-lg"
            style={{ animationDelay: "0.25s" }}
          >
            Independent designer turning wild ideas into playful, pixel-perfect
            products — brands, interfaces and websites people remember.
          </p>

          {/* CTAs */}
          <div
            className="hero-fade mt-10 flex flex-wrap items-center gap-4"
            style={{ animationDelay: "0.35s" }}
          >
            <a
              href="#book"
              className="inline-flex items-center gap-2.5 rounded-full bg-[#FFD23F] px-7 py-3.5 font-semibold text-black shadow-[5px_5px_0_0_#ffffff] transition-all duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_0_#ffffff]"
            >
              <Phone aria-hidden className="size-4" />
              Book a Call
            </a>
            <a
              href="#portfolio"
              className="group inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-3.5 font-medium text-white transition-colors duration-200 hover:bg-white/[0.06]"
            >
              View Portfolio
              <ArrowUpRight
                aria-hidden
                className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </div>
        </div>

        {/* Chips — pinned bottom-left */}
        <div
          className="hero-fade flex flex-wrap gap-3 pb-10"
          style={{ animationDelay: "0.5s" }}
        >
          {CHIPS.map(({ label, color }) => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-colors duration-200 hover:bg-white/5 hover:text-white"
            >
              <span aria-hidden className={`size-2 rounded-[2px] ${color}`} />
              {label}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
