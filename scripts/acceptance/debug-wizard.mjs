import { launchChrome, openPage } from "./cdp.mjs";

const { browser, proc } = await launchChrome({ port: 9228 });
try {
  const page = await openPage(browser, "http://localhost:3000/sessions/new");
  await page.waitForText("Scrim name");
  await page.setViewport(375, 667);
  for (let i = 0; i < 30; i++) {
    await page.evaluate(
      `(() => {
        const set = (id, v) => {
          const el = document.getElementById(id);
          if (!el) return;
          const prop = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
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
    } catch {}
    try {
      await page.waitForText("Team names", 1000);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  console.log("on step 2");
  await page.clickTextAndWait("Load 16 sample teams", "16 / 16 teams");
  await new Promise((r) => setTimeout(r, 500));
  const diag = await page.evaluate(
    `(() => { const b = [...document.querySelectorAll('button')].map(x => ({ t: x.textContent.trim().slice(0, 30), d: x.disabled })); return JSON.stringify(b); })()`,
  );
  console.log("buttons:", diag);
  await page.clickText("Next");
  await new Promise((r) => setTimeout(r, 1000));
  console.log("body:", (await page.evaluate("document.body.textContent")).replace(/\s+/g, " ").slice(0, 200));
} finally {
  browser.close();
  proc.kill();
}
