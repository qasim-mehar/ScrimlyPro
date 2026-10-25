"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { inter, sourceSerif4, yellowtail } from "./fonts";
import styles from "./reserve-section.module.css";

const STAGE_WIDTH = 620;
const STAGE_GUTTER = 48;

type StageVars = CSSProperties & Record<"--s", number>;

export default function ReserveSection() {
  const rootRef = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [scale, setScale] = useState(1);

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

  useEffect(() => {
    const update = () =>
      setScale(Math.min(1, (window.innerWidth - STAGE_GUTTER) / STAGE_WIDTH));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
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

      <div
        className={styles.stageWrap}
        style={{ "--s": scale } as StageVars}
        aria-hidden="true"
      >
        <div className={styles.stage}>
          <div className={styles.cardLeft}>
            <span className={styles.stripe} />
            <span className={styles.cardLogo}>Ness</span>
            <span className={styles.cardName}>Katherine McGonegall</span>
            <span className={styles.cardNumber}>5482 3452 3452 3456</span>
            <span className={styles.cardExpiry}>
              <span>09/27</span>
              <span>01/27</span>
            </span>
          </div>

          <div className={styles.cardRight}>
            <span className={`${styles.waveRing} ${styles.ringOne}`} />
            <span className={`${styles.waveRing} ${styles.ringTwo}`} />
            <span className={styles.chip} />
            <span className={styles.plaid}>plaid</span>
            <span className={styles.mcMark}>
              <span className={styles.mcOrange} />
              <span className={styles.mcRed} />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
