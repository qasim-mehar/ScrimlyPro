import { join } from "node:path";
import { launchChrome, openPage } from "./cdp.mjs";
import { writePng } from "./png.mjs";

writePng("shots/golden/logo1.png", 32, 32, [245, 197, 66]);
writePng("shots/golden/logo2.png", 32, 32, [66, 100, 245]);
const { browser, proc } = await launchChrome({ port: 9230 });
try {
  const page = await openPage(browser, "http://localhost:3000/sessions/new");
  await page.waitForText("Scrim name");
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
        set("scrim-name", "Logo Debug");
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
  await page.clickTextAndWait("Load 16 sample teams", "16 / 16 teams");
  const n = await page.setFiles([join(process.cwd(), "shots/golden/logo1.png")], 0);
  console.log("file inputs:", n);
  await new Promise((r) => setTimeout(r, 3000));
  const state = await page.evaluate(
    `(() => {
      const inputs = [...document.querySelectorAll('input[type=file]')];
      return JSON.stringify({
        count: inputs.length,
        firstHasFile: inputs[0] ? inputs[0].files.length : null,
        bodyHasRemove: document.body.textContent.includes('Remove logo'),
        bodyHasError: document.body.textContent.includes('Could not process'),
        errorText: (document.body.textContent.match(/Could not process[^"]{0,80}/) || [null])[0],
      });
    })()`,
  );
  console.log("state:", state);
} finally {
  browser.close();
  proc.kill();
}
