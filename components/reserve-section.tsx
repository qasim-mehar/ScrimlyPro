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
    <section ref={rootRef} className={rootClass}>
      <div className={styles.zoneA}>
        <h2 className={styles.headline}>
          Reserve
          <br />
          Your Card
        </h2>
        <p className={styles.subcopy}>
          We&rsquo;re still in beta.
          <br />
          Reserve your spot to join the next available batch.{" "}
          <span className={styles.sparkle} aria-hidden="true">
            ✨
          </span>
        </p>
        <button type="button" className={styles.cta}>
          Reserve
        </button>
        <p className={styles.footnote}>
          PS: The card&rsquo;s app is iPhone only, for now
        </p>
      </div>
    </section>
  );
}
