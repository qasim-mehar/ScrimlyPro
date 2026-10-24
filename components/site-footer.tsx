"use client";

import { useEffect, useRef, useState } from "react";
import { inter, sourceSerif4, yellowtail } from "./fonts";
import styles from "./site-footer.module.css";

const FOOTER_LINKS = [
  "The Nessie",
  "Terms of Service",
  "Partner Program",
  "Careers",
  "Privacy Policy",
] as const;

type SpinDirection = "ccw" | "cw" | null;

export default function SiteFooter() {
  const rootRef = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [spin, setSpin] = useState<SpinDirection>(null);
  const [logoSpinning, setLogoSpinning] = useState(false);

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

  const handleSpin = (direction: Exclude<SpinDirection, null>) => {
    if (spin) return;
    setSpin(direction);
    setLogoSpinning(true);
  };

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
    <footer ref={rootRef} className={rootClass}>
      <div className={styles.container}>
        <div className={`${styles.row} ${styles.row1}`}>
          <div className={styles.identity}>
            <span
              className={`${styles.wordmark} ${logoSpinning ? styles.logoSpin : ""}`}
              onAnimationEnd={() => setLogoSpinning(false)}
            >
              Ness
            </span>
            <p className={styles.copyright}>
              © 2023 Ness Inc. All rights reserved
            </p>
          </div>
          <nav className={styles.links} aria-label="Footer">
            {FOOTER_LINKS.map((label) => (
              <a key={label} className={styles.link} href="#">
                {label}
              </a>
            ))}
          </nav>
        </div>

        <div className={`${styles.row} ${styles.row2}`}>
          <div className={styles.legal}>
            <p>
              The Ness Credit Card is issued by The Bank of Missouri, member
              FDIC, pursuant to a license from Mastercard, and may be used
              everywhere Mastercard is accepted. 4400864
            </p>
            <p>
              All non-Ness logos shown are for illustrative purposes and remain
              the property of their respective owners.
            </p>
          </div>
          <ol className={styles.disclaimers}>
            <li>
              The Ness Card is a charge card. This means there is no APR, so
              your balance is due in full each month. For more about the Ness
              Card&rsquo;s terms &amp; fees visit{" "}
              <a className={styles.inlineLink} href="#">
                here
              </a>
              .
            </li>
            <li>
              See{" "}
              <a className={styles.inlineLink} href="#">
                Ness&rsquo;s terms
              </a>{" "}
              for details. Rewards terms and partners are subject to change.
            </li>
            <li>
              Access to the Ness account is subject to approval. To apply,
              you&rsquo;ll agree to a secure credit check and consent to Ness
              obtaining your credit report. At this time, only applicants with a
              U.S. Social Security Number can apply. Submitting an application
              will result in a hard credit inquiry, which may impact your
              credit score.
            </li>
          </ol>
        </div>

        <div className={styles.pillRow}>
          <div className={styles.pill}>
            <button
              type="button"
              className={styles.pillBtn}
              aria-label="Rotate counterclockwise"
              onClick={() => handleSpin("ccw")}
            >
              <span
                className={`${styles.icon} ${styles.iconCcw} ${spin === "ccw" ? styles.iconSpinCcw : ""}`}
                onAnimationEnd={() => setSpin(null)}
              />
            </button>
            <button
              type="button"
              className={styles.pillBtn}
              aria-label="Rotate clockwise"
              onClick={() => handleSpin("cw")}
            >
              <span
                className={`${styles.icon} ${styles.iconCw} ${spin === "cw" ? styles.iconSpinCw : ""}`}
                onAnimationEnd={() => setSpin(null)}
              />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
