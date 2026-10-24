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

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

type Perk = {
  name: string;
  sub: string;
  initials: string;
  tone: "light" | "fyt";
};

const PERKS: readonly Perk[] = [
  { name: "exhale", sub: "Spa & Recovery", initials: "ex", tone: "light" },
  { name: "obé Fitness", sub: "Member Exclusive", initials: "ob", tone: "light" },
  { name: "Fyt Personal Training", sub: "$200 credit", initials: "fy", tone: "fyt" },
];

type Stat = {
  prefix: string;
  value: number;
  suffix: string;
  label: string;
  superscript: boolean;
};

const STATS: readonly Stat[] = [
  { prefix: "", value: 6, suffix: "x", label: "Health & Wellness Spend", superscript: true },
  { prefix: "", value: 2, suffix: "x", label: "Everything Else", superscript: false },
  { prefix: "$", value: 399, suffix: "", label: "Annual Fee", superscript: true },
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
  const [inView, setInView] = useState(false);

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
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }
    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setInView(true);

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
  }, []);

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
      className={`${styles.root} ${serif.variable}`}
      data-inview={inView ? "true" : "false"}
    >
      <div className={styles.inner}>
        <h2 className={styles.headline} data-reveal="0">
          The Card That
          <br />
          Keeps You Healthy
        </h2>

        <p className={styles.sub} data-reveal="1">
          The first premium card that rewards all your healthy actions and
          includes amazing benefits from your favorite brands, too
          <sup>1</sup>
        </p>

        <div className={styles.btnGroup} data-reveal="2">
          <div className={styles.btnRow}>
            <a className={`${styles.btn} ${styles.btnReserve}`} href="#reserve">
              Reserve
            </a>
            <a className={`${styles.btn} ${styles.btnExplore}`} href="#explore">
              Explore
            </a>
          </div>
          <p className={styles.footnote}>
            Fit: The card&rsquo;s app is iPhone-only, for now
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

      <div className={styles.stripWrap} data-reveal="4">
        <div className={styles.bleed}>
          <div
            ref={scrollerRef}
            className={styles.scroller}
            role="region"
            aria-label="Partner perks"
            tabIndex={0}
            data-dragging="false"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClickCapture={onClickCapture}
            onDragStart={(event) => event.preventDefault()}
          >
            {PERKS.map((perk) => (
              <article className={styles.card} key={perk.name}>
                <div className={styles.cardFill} aria-hidden="true" />
                <div className={styles.cardOverlay}>
                  <div
                    className={`${styles.avatar} ${
                      perk.tone === "fyt" ? styles.avatarFyt : styles.avatarLight
                    }`}
                    aria-hidden="true"
                  >
                    {perk.initials}
                  </div>
                  <div>
                    <div className={styles.brandName}>{perk.name}</div>
                    <div className={styles.brandSub}>{perk.sub}</div>
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
