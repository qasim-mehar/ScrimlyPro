import { join } from "node:path";
import { launchChrome, openPage } from "./cdp.mjs";
import { writePng } from "./png.mjs";

writePng("shots/golden/a.png", 64, 64, [20, 24, 40]);
const { browser, proc } = await launchChrome({ port: 9231 });
try {
  await browser.send("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: join(process.cwd(), "shots", "golden", "downloads"),
    eventsEnabled: true,
  });
  const page = await openPage(browser, null);
  await page.send("Page.navigate", {
    url: "http://localhost:3000/sessions/7e55c84e-5f50-4c8b-9a70-d0ffdf80e958/matches/1",
  });
  await page.waitForText("Select screenshots", 30000);
  await new Promise((r) => setTimeout(r, 1500));
  const n = await page.setFiles([join(process.cwd(), "shots/golden/a.png")], 0);
  console.log("file inputs:", n);
  await new Promise((r) => setTimeout(r, 2000));
  const state = await page.evaluate(
    `(() => { const i = document.querySelectorAll('input[type=file]')[0]; return JSON.stringify({ files: i.files.length, name: i.files[0]?.name ?? null, hasLi: document.body.textContent.includes('a.png') }); })()`,
  );
  console.log("state:", state);
  console.log("body:", (await page.evaluate("document.body.textContent")).replace(/\s+/g, " ").slice(0, 250));
} finally {
  browser.close();
  proc.kill();
}
