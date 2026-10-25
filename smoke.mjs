// Throwaway OCR smoke test — NOT part of the product. Run:
//   npx tsx --env-file=.env.local smoke.mjs <shots-dir> <teamCount>
// Requires GEMINI_API_KEY in .env.local. Delete this file after the run.
// Needs `npm i --no-save sharp` (never saved to package.json).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { GeminiError, parseMatchSquads } from "@/lib/gemini";

const dir = process.argv[2];
const teamCount = Number(process.argv[3]);
if (!dir || !Number.isInteger(teamCount) || teamCount <= 0) {
  console.error("usage: npx tsx --env-file=.env.local smoke.mjs <shots-dir> <teamCount>");
  process.exit(1);
}

let entries;
try {
  entries = readdirSync(dir);
} catch (err) {
  console.error(`cannot read directory "${dir}": ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
const files = entries
  .filter((f) => /\.(jpe?g|png)$/i.test(f))
  .sort()
  .map((f) => join(dir, f));
if (files.length === 0) {
  console.error(`no .jpg/.jpeg/.png files in "${dir}"`);
  process.exit(1);
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const images = [];
for (const file of files) {
  const original = readFileSync(file);
  // longest edge ≤1600: fit "inside" a 1600×1600 box, never upscale
  const resized = await sharp(original)
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  console.log(`${file}: ${kb(original.length)} → ${kb(resized.length)}`);
  images.push({ mimeType: "image/jpeg", dataBase64: resized.toString("base64") });
}

const t0 = Date.now();
try {
  // default transport — the real @google/genai call chain with fallbacks
  const { squads, model, retried, warnings } = await parseMatchSquads(images, teamCount);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nmodel: ${model}  squads: ${squads.length}  retried: ${retried}  warnings: ${JSON.stringify(warnings)}  (${secs}s)`);
  let total = 0;
  for (const squad of squads) {
    const tag = squad.squadTag ? `[${squad.squadTag}] ` : "";
    const players = squad.players.map((p) => `${p.name}(${p.kills})`).join(" ");
    total += squad.players.reduce((sum, p) => sum + p.kills, 0);
    console.log(`${squad.placement}. ${tag}${players}`);
  }
  console.log(`lobby kills: ${total}`);
} catch (err) {
  if (err instanceof GeminiError) {
    console.error(`GeminiError ${err.code}: ${err.detail ?? ""}`);
    if (err.failure) console.error(JSON.stringify(err.failure, null, 2));
    process.exit(1);
  }
  throw err;
}
