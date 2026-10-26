"use client";

import { useEffect, useRef, useState } from "react";
import { inter, sourceSerif4, yellowtail } from "./fonts";
import styles from "./reserve-section.module.css";

export default function ReserveSection() {
  const rootRef = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const rootClass = [
    styles.root,
    inter.variable,
    sourceSerif4.variable,
    yellowtail.variable,
    revealed ? styles.revealed : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section ref={rootRef} id="pilot" className={rootClass}>
      <div className={styles.zoneA}>
        <h2 className={styles.headline}>
          Join
          <br />
          the Pilot
        </h2>
        <p className={styles.subcopy}>
          We&rsquo;re onboarding 5&ndash;15 organizer teams.
          <br />
          Pilot feedback shapes the first public release.{" "}
          <span className={styles.sparkle} aria-hidden="true">
            ✨
          </span>
        </p>
        <a href="/signup" className={styles.cta}>
          Request Access
        </a>
        <p className={styles.footnote}>
          PS: Invites are copy-paste links for now; email delivery is coming
        </p>
      </div>
    </section>
  );
}
