"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Great_Vibes, Source_Serif_4 } from "next/font/google";
import styles from "./CtaSection.module.css";
import { useReducedMotion } from "./useReducedMotion";

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const script = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
  display: "swap",
});

export default function CtaSection() {
  const rootRef = useRef<HTMLElement | null>(null);
  const [intersected, setIntersected] = useState(false);
  const reducedMotion = useReducedMotion();
  // Reduced motion reveals immediately (derived, not set from an effect).
  const inView = intersected || reducedMotion;

  // Reveal once at 0.25 visibility; skipped entirely when the user prefers
  // reduced motion (content shows immediately).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setIntersected(true);
      },
      { threshold: 0.25 }
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <section
      ref={rootRef}
      className={`${styles.root} ${serif.variable} ${script.variable}`}
      aria-labelledby="cta-heading"
      data-inview={inView ? "true" : "false"}
    >
      <Image
        className={styles.bg}
        src="/cta.jpeg"
        alt=""
        fill
        sizes="100vw"
        quality={90}
        aria-hidden="true"
        draggable={false}
      />
      <div className={styles.inner}>
        <h2 className={styles.headline} id="cta-heading" data-reveal="0">
          Built for teams
          <br />
          that <em className={styles.script}>grind</em>
        </h2>

        <p className={styles.sub} data-reveal="1">
          We&rsquo;re onboarding the first 5&ndash;15 organizer teams now.
          Pilot feedback directly shapes the first public release.
        </p>

        <div className={styles.ctaRow} data-reveal="2">
          <a className={styles.btn} href="#pilot">
            Join the Pilot
          </a>
        </div>
      </div>
    </section>
  );
}
