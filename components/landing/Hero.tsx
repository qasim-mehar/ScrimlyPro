"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";

const BTN_COLOR: Record<string, string> = {
  x: "var(--snes-blue)",
  a: "var(--snes-red)",
  b: "var(--snes-yellow)",
  y: "var(--snes-green)",
};

const STAR_PALETTE = [
  "var(--snes-blue)",
  "var(--snes-red)",
  "var(--snes-yellow)",
  "var(--snes-green)",
  "var(--ink)",
];

const STAR_PATH =
  "M12 1.7l2.5 7.8 7.8 2.5-7.8 2.5L12 22.3l-2.5-7.8-7.8-2.5 7.8-2.5z";

const NUDGE: Record<string, string> = {
  left: "nudge-left",
  right: "nudge-right",
  up: "nudge-up",
  down: "nudge-down",
};

function centerOf(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const swayRef = useRef<HTMLDivElement>(null);
  const sparkleRef = useRef<SVGSVGElement>(null);
  const fxLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pad = padRef.current;
    const sway = swayRef.current;
    const fxLayer = fxLayerRef.current;
    const hero = heroRef.current;
    if (!pad || !sway || !fxLayer || !hero) return;

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

    /* ---------- fx helpers (classes are global — see globals.css) ---------- */
    function popPlusOne(el: Element, color: string) {
      const { x, y } = centerOf(el);
      const s = document.createElement("span");
      s.className = "pop";
      s.textContent = "+1";
      s.style.left = x + (Math.random() * 18 - 9) + "px";
      s.style.top = y + "px";
      s.style.setProperty("--c", color);
      fxLayer!.appendChild(s);
      s.addEventListener("animationend", () => s.remove());
    }

    function starBurst(x: number, y: number, count = 9) {
      for (let i = 0; i < count; i++) {
        const star = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        star.setAttribute("viewBox", "0 0 24 24");
        star.classList.add("star-fly");
        const ang = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const dist = 46 + Math.random() * 58;
        star.style.left = x + "px";
        star.style.top = y + "px";
        star.style.setProperty("--dx", Math.cos(ang) * dist + "px");
        star.style.setProperty("--dy", Math.sin(ang) * dist + "px");
        star.style.setProperty("--c", STAR_PALETTE[i % STAR_PALETTE.length]);
        star.innerHTML = `<path d="${STAR_PATH}" fill="currentColor"/>`;
        fxLayer!.appendChild(star);
        star.addEventListener("animationend", () => star.remove());
      }
    }

    /* ---------- pointer parallax: the controller leans toward the cursor ---------- */
    let tx = 0, ty = 0, cx = 0, cy = 0, raf: number | null = null;

    function loop() {
      cx += (tx - cx) * 0.085;
      cy += (ty - cy) * 0.085;
      sway!.style.setProperty("--ry", (cx * 7).toFixed(2) + "deg");
      sway!.style.setProperty("--rx", (cy * -5.5).toFixed(2) + "deg");
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = null;
      }
    }

    function kick() {
      if (!raf && !reducedMotion.matches) raf = requestAnimationFrame(loop);
    }

    function onPointerMove(e: PointerEvent) {
      if (reducedMotion.matches || e.pointerType === "touch") return;
      const r = hero!.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      tx = Math.max(-1, Math.min(1, nx));
      ty = Math.max(-1, Math.min(1, ny));
      kick();
    }

    function onPointerLeave() {
      tx = 0;
      ty = 0;
      kick();
    }

    /* ---------- D-pad: press nudges the whole controller ---------- */
    // Select by data-* attributes: CSS Modules hash class names, so plain
    // class selectors would never match.
    const arms: Record<string, HTMLElement> = {};
    const armEls = pad.querySelectorAll<HTMLElement>("button[data-dir]");
    armEls.forEach((arm) => {
      arms[arm.dataset.dir!] = arm;
    });

    function dpadPress(dir: string) {
      arms[dir]?.classList.add("pressed");
      pad!.classList.add(NUDGE[dir]);
    }
    function dpadRelease(dir: string) {
      arms[dir]?.classList.remove("pressed");
      pad!.classList.remove(NUDGE[dir]);
    }

    /* ---------- the controller does a happy hop ---------- */
    function hop() {
      pad!.classList.remove("hop");
      void pad!.offsetWidth; // restart the animation
      pad!.classList.add("hop");
    }
    // hop is the only finite animation under .pad, so its animationend
    // is unambiguous (float/shadow loops never end)
    function onPadAnimationEnd() {
      pad!.classList.remove("hop");
    }

    function onCtaClick() {
      if (reducedMotion.matches) return;
      hop();
      if (sparkleRef.current) {
        const { x, y } = centerOf(sparkleRef.current);
        starBurst(x, y, 11);
      }
    }

    /* ---------- wire the controller's buttons ---------- */
    const cleanups: Array<() => void> = [];

    pad.querySelectorAll<HTMLElement>("button[data-btn]").forEach((btn) => {
      const onClick = () => popPlusOne(btn, BTN_COLOR[btn.dataset.btn!]);
      btn.addEventListener("click", onClick);
      cleanups.push(() => btn.removeEventListener("click", onClick));
    });

    pad.querySelectorAll<HTMLElement>("button[data-pill]").forEach((btn) => {
      const onClick = (e: Event) => {
        e.preventDefault();
        const { x, y } = centerOf(btn);
        starBurst(x, y, 7);
      };
      btn.addEventListener("click", onClick);
      cleanups.push(() => btn.removeEventListener("click", onClick));
    });

    armEls.forEach((arm) => {
      const dir = arm.dataset.dir!;
      const down = (e: PointerEvent) => {
        e.preventDefault();
        dpadPress(dir);
      };
      const click = () => {
        const { x, y } = centerOf(arm);
        starBurst(x, y, 4);
      };
      const release = () => dpadRelease(dir);
      arm.addEventListener("pointerdown", down);
      arm.addEventListener("click", click);
      for (const ev of ["pointerup", "pointerleave", "pointercancel"] as const) {
        arm.addEventListener(ev, release);
      }
      cleanups.push(() => {
        arm.removeEventListener("pointerdown", down);
        arm.removeEventListener("click", click);
        for (const ev of ["pointerup", "pointerleave", "pointercancel"] as const) {
          arm.removeEventListener(ev, release);
        }
      });
    });

    /* ---------- keyboard: arrows = D-pad, letters = face buttons ---------- */
    const KEY_BTN: Record<string, string> = { x: "x", a: "a", b: "b", y: "y" };
    const btnBy: Record<string, HTMLElement> = {};
    pad.querySelectorAll<HTMLElement>("button[data-btn]").forEach((b) => {
      btnBy[b.dataset.btn!] = b;
    });

    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      const t = e.target instanceof Element ? e.target : null;
      if (t && t.closest("input, textarea, [contenteditable]")) return;
      const k = e.key.toLowerCase();
      if (k.startsWith("arrow")) {
        const dir = k.replace("arrow", "");
        if (arms[dir]) {
          e.preventDefault();
          dpadPress(dir);
          const { x, y } = centerOf(arms[dir]);
          starBurst(x, y, 4);
        }
      } else if (KEY_BTN[k] && btnBy[k]) {
        e.preventDefault();
        btnBy[k].classList.add("pressed");
        popPlusOne(btnBy[k], BTN_COLOR[k]);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (k.startsWith("arrow")) {
        dpadRelease(k.replace("arrow", ""));
      } else if (KEY_BTN[k] && btnBy[k]) {
        btnBy[k].classList.remove("pressed");
      }
    }

    addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    addEventListener("keydown", onKeyDown);
    addEventListener("keyup", onKeyUp);
    pad.addEventListener("animationend", onPadAnimationEnd);

    document.querySelectorAll<HTMLElement>("[data-hop-cta]").forEach((cta) => {
      cta.addEventListener("click", onCtaClick);
    });

    return () => {
      removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      removeEventListener("keydown", onKeyDown);
      removeEventListener("keyup", onKeyUp);
      pad.removeEventListener("animationend", onPadAnimationEnd);
      document.querySelectorAll<HTMLElement>("[data-hop-cta]").forEach((cta) => {
        cta.removeEventListener("click", onCtaClick);
      });
      cleanups.forEach((fn) => fn());
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <a className={styles.brand} href="#">
          ScrimlyPro
        </a>

        <nav className={styles.navPill} aria-label="Primary">
          <a href="#top" aria-current="page">
            Home <span className={styles.arr}>→</span>
          </a>
          <a href="#features">
            Features <span className={styles.arr}>↗</span>
          </a>
          <a href="#pilot">
            The Pilot <span className={styles.arr}>↗</span>
          </a>
        </nav>

        <a className={styles.navCta} href="/signup" data-hop-cta>
          Get Started <span className={styles.arr}>↗</span>
        </a>
      </header>

      <main className={styles.hero} ref={heroRef}>
        <p className={styles.eyebrow}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#63656e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          For PUBG Mobile teams
        </p>

        <h1 className={styles.headline}>
          <span className={styles.line}>Stop typing</span>
          <br />
          <span className={styles.line}>
            scrim scores
            <svg
              className={styles.sparkle}
              ref={sparkleRef}
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d={STAR_PATH} />
            </svg>
          </span>
        </h1>

        <a className={styles.heroCta} href="/signup" data-hop-cta>
          Join the Pilot <span className={styles.arr}>→</span>
        </a>

        <div className={styles.stage}>
          <div
            className={styles.pad}
            ref={padRef}
            role="group"
            aria-label="Interactive SNES controller — try the buttons"
          >
            <div className={styles.padShadow} aria-hidden="true" />

            <div className={styles.sway} ref={swayRef}>
              <div className={styles.float}>
                <div className={styles.hopWrap}>
                  <div className={styles.tilt}>
                    <div className={`${styles.grip} ${styles.gripGl}`} aria-hidden="true" />
                    <div className={`${styles.grip} ${styles.gripGr}`} aria-hidden="true" />

                    <div className={styles.shell}>
                      <div className={styles.face}>
                        <div className={`${styles.well} ${styles.wLeft}`}>
                          <div className={styles.dpad} aria-label="D-pad">
                            <button className={`${styles.arm} ${styles.dUp}`} data-dir="up" aria-label="D-pad up" />
                            <button className={`${styles.arm} ${styles.dDown}`} data-dir="down" aria-label="D-pad down" />
                            <button className={`${styles.arm} ${styles.dLeft}`} data-dir="left" aria-label="D-pad left" />
                            <button className={`${styles.arm} ${styles.dRight}`} data-dir="right" aria-label="D-pad right" />
                            <div className={styles.dCenter} aria-hidden="true" />
                          </div>
                        </div>

                        <div className={styles.mid}>
                          <div className={styles.mark} aria-hidden="true">
                            <span className={styles.m1}>SUPER SCRIM</span>
                            <span className={styles.m2}>STANDINGS SYSTEM</span>
                          </div>
                          <div className={styles.pills}>
                            <span className={styles.pillWrap}>
                              <button
                                className={styles.pillBtn}
                                data-pill="upload"
                                aria-label="Upload (select button)"
                                title="Upload"
                              />
                              <span className={styles.pillLabel}>Upload</span>
                            </span>
                            <span className={styles.pillWrap}>
                              <button
                                className={styles.pillBtn}
                                data-pill="share"
                                aria-label="Share (start button)"
                                title="Share"
                              />
                              <span className={styles.pillLabel}>Share</span>
                            </span>
                          </div>
                        </div>

                        <div className={`${styles.well} ${styles.wRight}`}>
                          <div className={styles.abxy}>
                            <span className={`${styles.key} ${styles.kx}`} aria-hidden="true">
                              X
                            </span>
                            <span className={`${styles.key} ${styles.ka}`} aria-hidden="true">
                              A
                            </span>
                            <span className={`${styles.key} ${styles.kb}`} aria-hidden="true">
                              B
                            </span>
                            <span className={`${styles.key} ${styles.ky}`} aria-hidden="true">
                              Y
                            </span>
                            <button
                              className={`${styles.faceBtn} ${styles.fx}`}
                              data-btn="x"
                              style={{ "--c": "var(--snes-blue)" } as React.CSSProperties}
                              aria-label="X button"
                            />
                            <button
                              className={`${styles.faceBtn} ${styles.fa}`}
                              data-btn="a"
                              style={{ "--c": "var(--snes-red)" } as React.CSSProperties}
                              aria-label="A button"
                            />
                            <button
                              className={`${styles.faceBtn} ${styles.fb}`}
                              data-btn="b"
                              style={{ "--c": "var(--snes-yellow)" } as React.CSSProperties}
                              aria-label="B button"
                            />
                            <button
                              className={`${styles.faceBtn} ${styles.fy}`}
                              data-btn="y"
                              style={{ "--c": "var(--snes-green)" } as React.CSSProperties}
                              aria-label="Y button"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${styles.badge} ${styles.amirali}`} aria-label="The organizer is viewing">
              Organizer
              <svg width="17" height="21" viewBox="0 0 17 21" aria-hidden="true">
                <path
                  d="M1 1.5v16.2l4.4-4 3.3 6.2 2.9-1.5-3.3-6.2h6Z"
                  fill="#fff"
                  stroke="var(--badge-purple)"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={`${styles.badge} ${styles.sina}`} aria-label="The coach is viewing">
              <svg
                width="17"
                height="21"
                viewBox="0 0 17 21"
                aria-hidden="true"
                style={{ transform: "scaleX(-1)" }}
              >
                <path
                  d="M1 1.5v16.2l4.4-4 3.3 6.2 2.9-1.5-3.3-6.2h6Z"
                  fill="#fff"
                  stroke="var(--badge-orange)"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
              Coach
            </div>
          </div>
        </div>

        <nav className={styles.links} aria-label="Sections">
          <a className={styles.lPortfolio} href="#features">
            <span className={styles.bullet} aria-hidden="true" />
            Features
          </a>
          <a className={styles.lAchievements} href="#who">
            <span className={styles.bullet} aria-hidden="true" />
            Who it&rsquo;s for
          </a>
          <a className={styles.lFeedback} href="#pilot">
            <span className={styles.bullet} aria-hidden="true" />
            The Pilot
          </a>
          <a className={styles.lFaq} href="/login">
            <span className={styles.bullet} aria-hidden="true" />
            Log in
          </a>
        </nav>
      </main>

      <div className={styles.fxLayer} ref={fxLayerRef} aria-hidden="true" />
    </div>
  );
}
