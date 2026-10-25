"use client";

import { useEffect, useRef, useState } from "react";
import { inter, sourceSerif4, yellowtail } from "./fonts";
import styles from "./site-footer.module.css";

const FOOTER_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Who it's for", href: "#who" },
  { label: "The Pilot", href: "#pilot" },
  { label: "Log in", href: "/login" },
  { label: "Create account", href: "/signup" },
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
              ScrimlyPro
            </span>
            <p className={styles.copyright}>
              &copy; 2026 ScrimlyPro. Built for teams that grind.
            </p>
          </div>
          <nav className={styles.links} aria-label="Footer">
            {FOOTER_LINKS.map((link) => (
              <a key={link.label} className={styles.link} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className={`${styles.row} ${styles.row2}`}>
          <div className={styles.legal}>
            <p>
              ScrimlyPro turns PUBG Mobile scrim screenshots into
              auto-computed standings. Match images are read by Google Gemini;
              results live in your organization&rsquo;s private workspace.
            </p>
            <p>
              PUBG Mobile is a trademark of its respective owners. ScrimlyPro
              is an independent tool and is not affiliated with the
              game&rsquo;s publisher.
            </p>
          </div>
          <ol className={styles.disclaimers}>
            <li>
              During the pilot, every user gets monthly quotas for scrim
              sessions and AI reads. Hitting a limit blocks new work; it never
              locks you out of your existing data.
            </li>
            <li>
              Limits are per user. Creating extra organizations does not add
              quota. Need more? Contact support and we&rsquo;ll raise your
              limit.
            </li>
            <li>
              People join your organization through single-use invite links,
              and only a secure hash of each link is stored. Public share
              links show results and nothing else, and revoking one kills it
              immediately.
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
