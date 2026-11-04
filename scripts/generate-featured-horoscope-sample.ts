import { randomInt } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateFeatured } from "../lib/featuredHoroscopeGenerate";
import { SIGNS } from "../lib/horoscope/model";

async function main() {
  const day = process.argv[2] ?? "2026-11-05";
  const sign = SIGNS[randomInt(SIGNS.length)];
  const item = await generateFeatured(day, sign);
  writeFileSync(resolve(process.cwd(), "lib/featured-horoscope-sample.json"), `${JSON.stringify(item, null, 2)}\n`);
  console.log(`Generated local sample for ${day}: ${sign} (${item.model})`);
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
