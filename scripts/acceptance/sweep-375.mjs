// C7.1 Pass 1 — 375px sweep across every route: horizontal overflow,
// 44px touch targets, and status/empty-state sanity.
// Usage: node scripts/acceptance/sweep-375.mjs [sessionId]
// Requires the dev server on :3000 with SAMPLE_OCR=1 (for the draft-review
// route it drives a real upload on the seed session).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { launchChrome, openPage } from "./cdp.mjs";
import { writePng } from "./png.mjs";

const require = createRequire(import.meta.url);

const BASE = "http://localhost:3000";
const TOLERANCE = 2; // px tolerance on the 44px rule

console.log("sweep: starting");

function findSeedSession() {
  const Database = require("better-sqlite3");
  const db = new Database(join(process.cwd(), "data", "scrimly.db"), { readonly: true });
  const row = db
    .prepare("select id from sessions order by created_at desc limit 1")
    .get();
  db.close();
  if (!row) throw new Error("no sessions in DB — run npm run db:seed");
  return row.id;
}

const report = [];
function record(route, verdict, notes) {
  report.push({ route, verdict, notes });
  console.log(`${verdict === "PASS" ? "✅" : "❌"} ${route} — ${verdict}${notes ? ` (${notes})` : ""}`);
}

async function measureCurrent(page, route, label) {
  // let hydration settle
  await new Promise((r) => setTimeout(r, 800));

  const status = await page.evaluate(`document.body ? "ok" : "no-body"`);
  if (status !== "ok") {
    record(route, "FAIL", "no body");
    return;
  }

  const metrics = await page.evaluate(`(() => {
    const vw = document.documentElement.clientWidth;
    const result = {
      vw,
      scrollW: document.documentElement.scrollWidth,
      bodyScrollW: document.body.scrollWidth,
      offenders: [],
      smallTargets: [],
      targetCount: 0,
    };
    const selector = 'a[href], button, select, input, textarea, [role="button"], [role="tab"]';
    for (const el of document.querySelectorAll(selector)) {
      if (el.offsetParent === null && el.type !== "file") continue; // hidden
      if (el.type === "file") continue; // hidden file input, real target is its label
      result.targetCount++;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right > vw + 1 && !el.closest('[data-sweep-scrollable]')) {
        result.offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className + "").slice(0, 60),
          text: (el.textContent || "").trim().slice(0, 40),
          right: Math.round(r.right),
          w: Math.round(r.width),
        });
      }
      const minDim = Math.min(r.width, r.height);
      if (minDim < 44 - ${TOLERANCE} && minDim > 0) {
        result.smallTargets.push({
          tag: el.tagName.toLowerCase() + (el.type ? "[" + el.type + "]" : ""),
          text: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height),
        });
      }
    }
    // page-level horizontal overflow check (independent of which element)
    if (result.scrollW > vw + 1) {
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 && r.width > 8) {
          result.offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className + "").slice(0, 60),
            text: (el.textContent || "").trim().slice(0, 40),
            right: Math.round(r.right),
            w: Math.round(r.width),
          });
        }
      }
    }
    result.offenders = result.offenders.slice(0, 6);
    result.smallTargets = result.smallTargets.slice(0, 8);
    return result;
  })()`);

  const overflow = metrics.scrollW > metrics.vw + 1 || metrics.bodyScrollW > metrics.vw + 1;
  const problems = [];
  if (overflow) problems.push(`overflow scrollW=${metrics.scrollW} vw=${metrics.vw}`);
  if (metrics.offenders.length) {
    problems.push(
      `offenders: ${JSON.stringify(metrics.offenders)}`,
    );
  }
  if (metrics.smallTargets.length) {
    problems.push(`small targets: ${JSON.stringify(metrics.smallTargets)}`);
  }
  record(route, problems.length ? "FAIL" : "PASS", problems.join(" | ") || `${metrics.targetCount} targets, scrollW=${metrics.scrollW}`);
}

async function sweepRoute(page, route, label) {
  await page.send("Page.navigate", { url: BASE + route });
  await page
    .waitFor(
      `document.readyState === "complete" && document.body !== null`,
      30000,
    )
    .catch(() => {});
  await measureCurrent(page, route, label);
}

const sessionId = process.argv[2] ?? findSeedSession();

// fixtures for the draft-review upload
mkdirSync("shots/sweep", { recursive: true });
writePng("shots/sweep/a.png", 64, 64, [20, 24, 40]);
writePng("shots/sweep/b.png", 64, 64, [40, 30, 10]);

async function main() {
  const { browser, proc } = await launchChrome({ port: 9225 });
  try {
    const page = await openPage(browser, null);

    // Draft review route needs a draft on the seed session. If a draft
    // already exists the page shows the review form directly; otherwise
    // drive a real SAMPLE_OCR upload (match 3).
    await page.setViewport(375, 667);
    await page.send("Page.navigate", { url: `${BASE}/sessions/${sessionId}/matches/3` });
    await page.waitFor(
      `document.querySelector('input[type="file"]') !== null || document.body.textContent.includes("Confirm Match 3")`,
      30000,
    );
    const hasDraft = await page.evaluate(
      `document.body.textContent.includes("Confirm Match 3")`,
    );
    if (!hasDraft) {
      await page.setFilesAndWait(
        [
          join(process.cwd(), "shots", "sweep", "a.png"),
          join(process.cwd(), "shots", "sweep", "b.png"),
        ],
        "a.png",
        0,
      );
      await page.clickText("Parse with Gemini");
      await page.waitForText("Confirm Match 3", 60000);
    }

    const routes = [
      ["/", "entry"],
      ["/sessions/new", "wizard"],
      [`/sessions/${sessionId}`, "session page"],
      [`/sessions/${sessionId}/matches/3`, "draft review form"],
      [`/sessions/${sessionId}/mvp`, "mvp editor"],
      [`/sessions/${sessionId}/matches/7`, "bad matchNo (404)"],
      ["/sessions/nope", "bad session (404)"],
      ["/dev/graphics", "dev graphics"],
      ["/dev/standings", "dev standings"],
      ["/dev/announcement", "dev announcement"],
      ["/dev/mvp", "dev mvp"],
      ["/dev/glyphs", "dev glyphs"],
    ];
    for (const [route, label] of routes) {
      await sweepRoute(page, route, label);
    }

    // Client-state variants: session tabs + wizard steps render only after
    // interaction — measure those states without re-navigating.
    await page.send("Page.navigate", { url: `${BASE}/sessions/${sessionId}` });
    await page.waitForText("Matches");
    await page.clickTextAndWait("Standings", "RANK");
    await measureCurrent(page, `/sessions/${sessionId}`, "standings tab");

    await page.send("Page.navigate", { url: `${BASE}/sessions/${sessionId}` });
    await page.waitForText("Matches");
    await page.clickTextAndWait("Graphics", "ANNOUNCEMENT");
    await measureCurrent(page, `/sessions/${sessionId}`, "graphics tab (scaled canvases)");

    await page.send("Page.navigate", { url: `${BASE}/sessions/new` });
    await page.waitForText("Scrim name");
    const deadline = Date.now() + 20000;
    for (;;) {
      await page.evaluate(
        `(() => {
          const set = (id, v) => {
            const el = document.getElementById(id);
            if (!el) return;
            const prop = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
            // Clear first: if the value was set pre-hydration, React's value
            // tracker already records it — re-setting the same string is
            // deduped and onChange never fires.
            prop.set.call(el, "");
            el.dispatchEvent(new Event("input", { bubbles: true }));
            prop.set.call(el, v);
            el.dispatchEvent(new Event("input", { bubbles: true }));
          };
          set("scrim-name", "375 Sweep Scrim");
          set("planned-matches", "1");
        })()`,
      );
      try {
        await page.clickText("Next");
      } catch {
        // not in DOM yet
      }
      try {
        await page.waitForText("Team names", 2000);
        break;
      } catch {
        if (Date.now() > deadline) {
          const diag = await page.evaluate(
            `(() => { const b = [...document.querySelectorAll('button')].map(x => ({ t: x.textContent.trim(), d: x.disabled })); return JSON.stringify({ url: location.href, name: document.getElementById('scrim-name') ? document.getElementById('scrim-name').value : null, buttons: b.slice(0, 8) }); })()`,
          ).catch((e) => `diag failed: ${e}`);
          console.log("wizard diag:", diag);
          throw new Error("wizard step 2 never appeared");
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    await page.clickTextAndWait("Load 16 sample teams", "16 / 16 teams");
    await measureCurrent(page, "/sessions/new", "wizard step 2 (16 teams)");
    await page.clickTextAndWait("Next", "Create Scrim");
    await measureCurrent(page, "/sessions/new", "wizard step 3 (confirm)");

    writeFileSync("shots/sweep/report.json", JSON.stringify(report, null, 2));
    const fails = report.filter((r) => r.verdict === "FAIL");
    console.log(`\n${report.length - fails.length}/${report.length} routes clean at 375px`);
    if (fails.length) process.exitCode = 1;
  } finally {
    browser.close();
    proc.kill();
  }
}

main().catch((err) => {
  console.error("SWEEP ERROR:", err);
  process.exitCode = 1;
});
