import { join } from "node:path";
import { launchChrome, openPage } from "./cdp.mjs";
import { writePng } from "./png.mjs";

writePng("shots/sweep/a.png", 64, 64, [20, 24, 40]);
writePng("shots/sweep/b.png", 64, 64, [40, 30, 10]);
const { browser, proc } = await launchChrome({ port: 9227 });
try {
  const page = await openPage(
    browser,
    "http://localhost:3000/sessions/seed-00000000-0000-4000-8000-000000000001/matches/3",
  );
  await page.waitForText("Select screenshots");
  await page.setViewport(375, 667);
  await page.setFilesAndWait(
    [join(process.cwd(), "shots/sweep/a.png"), join(process.cwd(), "shots/sweep/b.png")],
    "a.png",
    0,
    20000,
  );
  console.log("setFilesAndWait OK");
  const btn = await page.evaluate(
    `(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Parse')); return b ? { disabled: b.disabled, text: b.textContent.trim() } : null; })()`,
  );
  console.log("parse button:", JSON.stringify(btn));
  await page.clickText("Parse with Gemini");
  await page.waitForText("Confirm Match 3", 60000);
  console.log("review form reached");
} finally {
  browser.close();
  proc.kill();
}
