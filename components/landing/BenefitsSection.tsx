"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Source_Serif_4 } from "next/font/google";
import styles from "./BenefitsSection.module.css";
import { useReducedMotion } from "./useReducedMotion";

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

type Role = {
  name: string;
  sub: string;
  initials: string;
  tone: "light" | "fyt";
};

const ROLES: readonly Role[] = [
  { name: "Scrim organizer", sub: "Creates sessions, uploads the screenshots", initials: "so", tone: "light" },
  { name: "Coach / analyst", sub: "Clean match data minutes after each game", initials: "ca", tone: "fyt" },
  { name: "Team owner", sub: "Private workspace, roles, single-use invites", initials: "to", tone: "light" },
  { name: "Fans & sister teams", sub: "Public standings links, no login", initials: "fa", tone: "fyt" },
];

type Stat = {
  prefix: string;
  value: number;
  suffix: string;
  label: string;
  superscript: boolean;
};

const STATS: readonly Stat[] = [
  { prefix: "", value: 1, suffix: " min", label: "From upload to standings", superscript: true },
  { prefix: "", value: 600, suffix: "", label: "Automated checks gate every change", superscript: false },
  { prefix: "", value: 0, suffix: "", label: "Scores typed by hand", superscript: false },
];

const DRAG_THRESHOLD_PX = 6;
const COUNT_UP_MS = 900;

// useLayoutEffect warns during SSR; swap in useEffect on the server only.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function BenefitsSection() {
  const rootRef = useRef<HTMLElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const statValueRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const hasUserScrolledRef = useRef(false);
  const suppressClickRef = useRef(false);
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
    dragged: false,
  });
  const [intersected, setIntersected] = useState(false);
  const reducedMotion = useReducedMotion();
  // Reduced motion reveals immediately (derived, never set from an effect).
  const inView = intersected || reducedMotion;

  const centerScroller = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);

  // Initial centering on the middle card (client-only) + re-center on resize
  // only while the user has never scrolled manually.
  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;
    centerScroller();
    const onResize = () => {
      if (!hasUserScrolledRef.current) centerScroller();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [centerScroller]);

  // Mark the strip as user-scrolled on wheel / touch / keyboard scrolling so
  // resize re-centering stops overriding the user's position.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const mark = () => {
      hasUserScrolledRef.current = true;
    };
    el.addEventListener("wheel", mark, { passive: true });
    el.addEventListener("touchstart", mark, { passive: true });
    el.addEventListener("keydown", mark);
    return () => {
      el.removeEventListener("wheel", mark);
      el.removeEventListener("touchstart", mark);
      el.removeEventListener("keydown", mark);
    };
  }, []);

  // Shared IntersectionObserver: reveal once at 0.2, then run stat count-ups
  // (skipped entirely when the user prefers reduced motion).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;
    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setIntersected(true);

        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / COUNT_UP_MS, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          STATS.forEach((stat, i) => {
            const el = statValueRefs.current[i];
            if (el) {
              el.textContent = `${stat.prefix}${Math.round(stat.value * eased)}${stat.suffix}`;
            }
          });
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.2 }
    );
    observer.observe(root);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Touch/pen rely on native scrolling; only mouse gets hand-rolled drag.
    if (event.pointerType === "touch") return;
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: el.scrollLeft,
      dragged: false,
    };
    el.setPointerCapture(event.pointerId);
    el.dataset.dragging = "true";
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = event.clientX - drag.startX;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX) {
      drag.dragged = true;
      hasUserScrolledRef.current = true;
    }
    if (drag.dragged) el.scrollLeft = drag.startScrollLeft - dx;
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    const el = scrollerRef.current;
    if (el) {
      el.dataset.dragging = "false";
      if (el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId);
      }
    }
    suppressClickRef.current = drag.dragged;
    dragRef.current = { pointerId: -1, startX: 0, startScrollLeft: 0, dragged: false };
  };

  // Swallow the click that follows a drag so card links never fire after it.
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <section
      ref={rootRef}
      id="features"
      className={`${styles.root} ${serif.variable}`}
      data-inview={inView ? "true" : "false"}
    >
      <div className={styles.inner}>
        <h2 className={styles.headline} data-reveal="0">
          One upload,
          <br />
          zero typos
        </h2>

        <p className={styles.sub} data-reveal="1">
          After each match, the organizer uploads one screenshot. Our AI
          reader pulls the team names, placements, and kills out of it, and
          the session standings update themselves.
        </p>

        <div className={styles.btnGroup} data-reveal="2">
          <div className={styles.btnRow}>
            <a className={`${styles.btn} ${styles.btnReserve}`} href="#pilot">
              Join the Pilot
            </a>
            <a className={`${styles.btn} ${styles.btnExplore}`} href="/signup">
              Create an Account
            </a>
          </div>
          <p className={styles.footnote}>
            ¹ Typical loop: about a minute per match, upload to updated
            standings
          </p>
        </div>

        <div className={styles.stats}>
          {STATS.map((stat, i) => (
            <div className={styles.stat} key={stat.label} data-reveal={String(3 + i)}>
              <span
                className={styles.statValue}
                ref={(el) => {
                  statValueRefs.current[i] = el;
                }}
              >
                {stat.prefix}
                {stat.value}
                {stat.suffix}
              </span>
              <span className={styles.statLabel}>
                {stat.label}
                {stat.superscript ? <sup>1</sup> : null}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.stripWrap} id="who" data-reveal="4">
        <div className={styles.bleed}>
          <div
            ref={scrollerRef}
            className={styles.scroller}
            role="region"
            aria-label="Who ScrimlyPro is for"
            tabIndex={0}
            data-dragging="false"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClickCapture={onClickCapture}
            onDragStart={(event) => event.preventDefault()}
          >
            {ROLES.map((role) => (
              <article className={styles.card} key={role.name}>
                <div className={styles.cardFill} aria-hidden="true" />
                <div className={styles.cardOverlay}>
                  <div
                    className={`${styles.avatar} ${
                      role.tone === "fyt" ? styles.avatarFyt : styles.avatarLight
                    }`}
                    aria-hidden="true"
                  >
                    {role.initials}
                  </div>
                  <div>
                    <div className={styles.brandName}>{role.name}</div>
                    <div className={styles.brandSub}>{role.sub}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
