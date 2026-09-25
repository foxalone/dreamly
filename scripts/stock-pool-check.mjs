#!/usr/bin/env node
// Live check of the three Stock Pool keys: `npm run stock-pool-check -- snake`.
// Uses 1 request per library (Coverr demo keys allow 50/hour).
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { buildPool, searchProvider, STOCK_PROVIDERS, words } from "./stockPool.mjs";

const term = process.argv.slice(2).join(" ") || "snake";
const root = process.env.MONEYPRINTERTURBO_ROOT || path.join(homedir(), "MoneyPrinterTurbo");
const fromToml = (name) => {
  const file = path.join(root, "config.toml");
  if (!existsSync(file)) return "";
  return readFileSync(file, "utf8").match(new RegExp(`^${name}\\s*=\\s*\\[\\s*["']([^"']+)["']`, "m"))?.[1] ?? "";
};
const keys = {
  pexels: process.env.PEXELS_API_KEY || process.env.VIDEO_PEXELS_API_KEY || fromToml("pexels_api_keys"),
  pixabay: process.env.PIXABAY_API_KEY || fromToml("pixabay_api_keys"),
  coverr: process.env.COVERR_API_KEY || "",
};
const all = [];
for (const provider of STOCK_PROVIDERS) {
  if (!keys[provider]) { console.log(`${provider.padEnd(8)} ✗ no API key`); continue; }
  try {
    const items = await searchProvider(provider, term, { keys });
    all.push(...items);
    console.log(`${provider.padEnd(8)} ✓ ${items.length} portrait clips for "${term}"`);
  } catch (error) {
    console.log(`${provider.padEnd(8)} ✗ ${error.message}`);
  }
}
const pool = buildPool(all, { scriptWords: new Set(words(term)), clipDuration: 5, history: {} });
console.log(`\npool: ${pool.length} usable clips · top 8:`);
for (const item of pool.slice(0, 8)) {
  console.log(`  ${item.score.toFixed(2)}  ${item.provider.padEnd(8)} ${item.width}x${item.height} ${Math.round(item.duration)}s  ${String(item.text).slice(0, 70)}`);
}
