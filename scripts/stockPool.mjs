// Stock Pool: search Pexels, Pixabay and Coverr for the same visual terms,
// pool every usable portrait clip, score the pool, and pick the best clips for
// one Short. Pure helpers (normalize/score/pick/prompt) are exported for tests;
// network helpers take an injectable fetch.

import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export const STOCK_PROVIDERS = ["pexels", "pixabay", "coverr"];
export const PROVIDER_LABELS = { pexels: "Pexels", pixabay: "Pixabay", coverr: "Coverr" };

const SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // Pixabay asks for 24h result caching
const RECENT_DAYS = 60;
const MAX_HISTORY_ITEMS = 5_000;
// Short side of the frame: 540 = 960x540 either way round. Orientation-agnostic.
const MIN_SHORT_SIDE = 540;
const COVERR_BASE = "https://api.coverr.co";

const ABSTRACT_WORDS = new Set([
  "analysis", "dream", "dreamed", "dreaming", "dreams", "dreamt", "interpretation", "interpretations",
  "meaning", "meanings", "significance", "spiritual", "symbol", "symbolism", "symbolisms", "symbols",
]);
const STOPWORDS = new Set([
  "a", "about", "an", "and", "does", "ever", "for", "from", "have", "happened", "how", "in", "into", "it",
  "mean", "of", "on", "or", "the", "this", "to", "what", "when", "which", "who", "why", "with", "you", "your",
]);
const GENERIC_VISUAL_TERMS = ["person sleeping", "night sky", "bedroom at night", "close up eyes"];

export function normalizeProviders(value) {
  const list = Array.isArray(value) ? value : [];
  const picked = STOCK_PROVIDERS.filter((provider) => list.includes(provider));
  return picked.length ? picked : [...STOCK_PROVIDERS];
}

function clean(term) {
  return String(term ?? "").toLowerCase().replace(/[?!.,'"]/g, " ").split(/\s+/).filter(Boolean).join(" ");
}

export function words(text) {
  return clean(text).split(" ").filter((word) => word.length > 2 && !STOPWORDS.has(word) && !ABSTRACT_WORDS.has(word));
}

/** GPT search terms → short visual queries (same idea as the Free Mix helper). */
export function expandSearchTerms(terms, topic = "", limit = 6) {
  const out = [];
  const add = (term) => {
    const cleaned = clean(term);
    if (cleaned && !out.includes(cleaned)) out.push(cleaned);
  };
  for (const term of terms) {
    const visual = clean(term).split(" ").filter((word) => !STOPWORDS.has(word) && !ABSTRACT_WORDS.has(word));
    if (visual.length) add(visual.join(" "));
  }
  for (const word of words(topic)) add(word);
  for (const fallback of GENERIC_VISUAL_TERMS) {
    if (out.length >= 4) break;
    add(fallback);
  }
  return out.slice(0, limit);
}

// ---------- normalization (one shape for all three libraries) ----------
// orientation: "portrait" (9:16 Shorts) or "landscape" (16:9 YouTube videos).

export function matchesOrientation(width, height, orientation = "portrait") {
  return orientation === "landscape" ? Number(width) > Number(height) : Number(height) > Number(width);
}

const shortSide = (item) => Math.min(Number(item.width), Number(item.height));

function slugText(url) {
  const match = /\/video\/([^/]+?)(?:-\d+)?\/?$/.exec(String(url ?? ""));
  return match ? match[1].replace(/-/g, " ") : "";
}

export function normalizePexels(video, term, orientation = "portrait") {
  const files = (video?.video_files ?? []).filter((file) =>
    String(file.file_type ?? "").includes("mp4") && matchesOrientation(file.width, file.height, orientation) && file.link);
  if (!files.length) return null;
  const sorted = [...files].sort((a, b) => shortSide(a) - shortSide(b));
  // Smallest rendition that is at least 720x1280 (portrait) / 1920x1080 (landscape), else the largest.
  const file = sorted.find((item) => shortSide(item) >= (orientation === "landscape" ? 1080 : 720)) ?? sorted[sorted.length - 1];
  return {
    provider: "pexels",
    assetId: String(video.id),
    text: slugText(video.url),
    width: Number(file.width),
    height: Number(file.height),
    duration: Number(video.duration) || 0,
    downloadUrl: String(file.link),
    sourcePage: String(video.url ?? "https://www.pexels.com"),
    author: String(video.user?.name ?? ""),
    term,
  };
}

export function normalizePixabay(hit, term, orientation = "portrait") {
  const variants = ["large", "medium", "small"].map((size) => hit?.videos?.[size]).filter((item) => item?.url);
  const fitting = variants.filter((item) => matchesOrientation(item.width, item.height, orientation));
  if (!fitting.length) return null;
  // large → medium → small; skip 4K "large" files (slow to download, no gain in a 1080p render).
  const file = fitting.find((item) => shortSide(item) >= 720 && Math.max(item.width, item.height) <= 2560) ?? fitting[0];
  return {
    provider: "pixabay",
    assetId: String(hit.id),
    text: String(hit.tags ?? ""),
    width: Number(file.width),
    height: Number(file.height),
    duration: Number(hit.duration) || 0,
    downloadUrl: String(file.url),
    sourcePage: String(hit.pageURL ?? "https://pixabay.com"),
    author: String(hit.user ?? ""),
    term,
  };
}

export function normalizeCoverr(hit, term, orientation = "portrait") {
  const width = Number(hit?.max_width) || 0;
  const height = Number(hit?.max_height) || 0;
  const vertical = hit?.is_vertical === true || height > width;
  const url = hit?.urls?.mp4;
  if (!url || vertical !== (orientation === "portrait")) return null;
  return {
    provider: "coverr",
    assetId: String(hit.id),
    text: [hit.title, hit.description, ...(Array.isArray(hit.tags) ? hit.tags : [])].filter(Boolean).join(" · "),
    width,
    height,
    duration: Number(hit.duration) || 0,
    downloadUrl: String(url),
    sourcePage: `https://coverr.co/videos/${hit.id}`,
    author: "",
    term,
  };
}

export function candidateKey(candidate) {
  return `${candidate.provider}:${candidate.assetId}`;
}

// ---------- scoring & picking ----------

/** 0..~10. Relevance to the script dominates, then quality, then duration fit. */
export function scoreCandidate(candidate, { scriptWords, clipDuration = 5, history = {} }) {
  const text = new Set(words(candidate.text));
  const termWords = words(candidate.term);
  const termHits = termWords.filter((word) => text.has(word)).length;
  const scriptHits = [...scriptWords].filter((word) => text.has(word)).length;
  const relevance = Math.min(4, termHits * 1.5 + scriptHits * 0.75) + (text.size ? 0 : -0.5);
  // Short side vs 1080: 1080x1920 and 1920x1080 both score full marks.
  const quality = Math.min(1, shortSide(candidate) / 1080) * 2.5 + (shortSide(candidate) >= 720 ? 0.5 : 0);
  const fit = candidate.duration >= clipDuration ? Math.min(1.5, 0.75 + (candidate.duration - clipDuration) / 20) : -3;
  const recent = history[candidateKey(candidate)] ? -4 : 0;
  return Math.round((relevance + quality + fit + recent) * 100) / 100;
}

/** Dedupe, drop unusable clips, score, sort best first. */
export function buildPool(candidates, options) {
  const seen = new Set();
  const pool = [];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const key = candidateKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    if (shortSide(candidate) < MIN_SHORT_SIDE || candidate.duration < (options.clipDuration ?? 5)) continue;
    pool.push({ ...candidate, key, score: scoreCandidate(candidate, options) });
  }
  return pool.sort((a, b) => b.score - a.score);
}

/** Best-first, but no search term more than twice in a row so the Short keeps moving. */
export function heuristicPick(pool, count) {
  const picked = [];
  const perTerm = new Map();
  for (const candidate of pool) {
    if (picked.length >= count) break;
    const used = perTerm.get(candidate.term) ?? 0;
    if (used >= 2) continue;
    picked.push(candidate);
    perTerm.set(candidate.term, used + 1);
  }
  for (const candidate of pool) {
    if (picked.length >= count) break;
    if (!picked.includes(candidate)) picked.push(candidate);
  }
  return picked;
}

export const POOL_PICK_SCHEMA = {
  name: "stock_pool_pick",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      picks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { id: { type: "string" }, reason: { type: "string" } },
          required: ["id", "reason"],
        },
      },
    },
    required: ["picks"],
  },
};

export function buildPickPrompt(script, shortlist, count, orientation = "portrait") {
  const format = orientation === "landscape" ? "horizontal 16:9 YouTube video" : "vertical YouTube Short";
  const lines = shortlist.map((candidate, index) =>
    `c${index + 1} | ${PROVIDER_LABELS[candidate.provider]} | ${Math.round(candidate.duration)}s | ${candidate.width}x${candidate.height} | ` +
    `found by "${candidate.term}" | ${String(candidate.text || "(no description)").slice(0, 160)}`);
  return [
    {
      role: "system",
      content:
        `You are the editor of a ${format}. From a pool of stock clips in that orientation gathered from several free libraries, ` +
        `choose exactly ${count} different clips and put them in the order they should appear under the narration. ` +
        "Judge each clip only by its description, resolution and length. Prefer clips that literally show what the narration " +
        "says at that moment, then higher resolution. Keep the sequence visually varied (no near-duplicates back to back). " +
        "Do not favour a library for its own sake — pick the best clips wherever they come from. Reasons: max 12 words.",
    },
    { role: "user", content: `Narration:\n${script}\n\nPool:\n${lines.join("\n")}` },
  ];
}

/** Map model output back to candidates; fill gaps from the heuristic order. */
export function resolvePicks(picks, shortlist, count) {
  const chosen = [];
  for (const pick of Array.isArray(picks) ? picks : []) {
    const match = /^c(\d+)$/i.exec(String(pick?.id ?? "").trim());
    const candidate = match ? shortlist[Number(match[1]) - 1] : null;
    if (candidate && !chosen.some((item) => item.key === candidate.key)) {
      chosen.push({ ...candidate, reason: String(pick.reason ?? "").slice(0, 120) });
    }
    if (chosen.length >= count) break;
  }
  const aiCount = chosen.length;
  for (const candidate of heuristicPick(shortlist, shortlist.length)) {
    if (chosen.length >= count) break;
    if (!chosen.some((item) => item.key === candidate.key)) chosen.push({ ...candidate, reason: "" });
  }
  return { chosen, aiCount };
}

// ---------- persistence (shared with the Free Mix helper) ----------

export function historyPath(root) {
  return path.join(root, "storage", "mixed_stock", "recent-materials.json");
}

export function loadHistory(root, now = Date.now()) {
  try {
    const payload = JSON.parse(readFileSync(historyPath(root), "utf8"));
    const cutoff = now / 1000 - RECENT_DAYS * 86_400;
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => typeof value === "number" && value >= cutoff));
  } catch {
    return {};
  }
}

export function saveHistory(root, history) {
  const target = historyPath(root);
  mkdirSync(path.dirname(target), { recursive: true });
  const newest = Object.fromEntries(Object.entries(history).sort((a, b) => b[1] - a[1]).slice(0, MAX_HISTORY_ITEMS));
  const temporary = `${target}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(newest));
  renameSync(temporary, target);
}

function cachePath(root, provider, term, orientation = "portrait") {
  // Portrait keeps the original key so existing Stock Pool caches stay valid.
  const key = orientation === "portrait" ? `${provider}:${term}` : `${provider}:${orientation}:${term}`;
  const digest = createHash("sha256").update(key).digest("hex").slice(0, 24);
  return path.join(root, "storage", "stock_pool_cache", `${provider}-${digest}.json`);
}

function readCache(root, provider, term, orientation) {
  const file = cachePath(root, provider, term, orientation);
  try {
    if (Date.now() - statSync(file).mtimeMs > SEARCH_CACHE_TTL_MS) return null;
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeCache(root, provider, term, orientation, items) {
  const file = cachePath(root, provider, term, orientation);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(items));
}

// ---------- network ----------

async function getJson(fetchImpl, url, headers = {}) {
  const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    const error = new Error(`${new URL(url).host} ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function searchProvider(provider, term, { keys, fetchImpl = fetch, orientation = "portrait" }) {
  const q = encodeURIComponent(term);
  if (provider === "pexels") {
    const payload = await getJson(fetchImpl,
      `https://api.pexels.com/videos/search?query=${q}&orientation=${orientation}&size=medium&per_page=40`,
      { Authorization: keys.pexels });
    return (payload.videos ?? []).map((video) => normalizePexels(video, term, orientation)).filter(Boolean);
  }
  if (provider === "pixabay") {
    const payload = await getJson(fetchImpl,
      `https://pixabay.com/api/videos/?key=${encodeURIComponent(keys.pixabay)}&q=${q}&per_page=50&safesearch=true`);
    return (payload.hits ?? []).map((hit) => normalizePixabay(hit, term, orientation)).filter(Boolean);
  }
  if (provider === "coverr") {
    const payload = await getJson(fetchImpl,
      `${COVERR_BASE}/videos?query=${q}&page_size=50&urls=true`,
      { Authorization: `Bearer ${keys.coverr}` });
    return (payload.hits ?? []).map((hit) => normalizeCoverr(hit, term, orientation)).filter(Boolean);
  }
  throw new Error(`Unknown stock provider ${provider}`);
}

/**
 * Search every enabled provider for every term. A failing provider (bad key,
 * Coverr's 50 req/h demo limit) is logged and skipped, never fatal on its own.
 */
export async function gatherCandidates({
  providers, terms, keys, root, log = () => {}, fetchImpl = fetch, coverrSearchBudget = 5, orientation = "portrait",
}) {
  const all = [];
  const stats = Object.fromEntries(providers.map((provider) => [provider, { searches: 0, cached: 0, found: 0, error: "" }]));
  let coverrLeft = coverrSearchBudget;
  for (const term of terms) {
    for (const provider of providers) {
      const stat = stats[provider];
      if (!keys[provider] || stat.error.startsWith("stop:")) continue;
      let items = root ? readCache(root, provider, term, orientation) : null;
      if (items) stat.cached += 1;
      else {
        if (provider === "coverr" && coverrLeft <= 0) continue;
        try {
          if (provider === "coverr") coverrLeft -= 1;
          stat.searches += 1;
          items = await searchProvider(provider, term, { keys, fetchImpl, orientation });
          if (root) writeCache(root, provider, term, orientation, items);
        } catch (error) {
          const status = error?.status;
          stat.error = `${[401, 403, 429].includes(status) ? "stop:" : ""}${error.message}`;
          log(`stock pool ${provider} "${term}" failed: ${error.message}`);
          continue;
        }
      }
      stat.found += items.length;
      all.push(...items);
      log(`stock pool ${provider} "${term}" → ${items.length} ${orientation} clips`);
    }
  }
  return { candidates: all, stats };
}

export async function downloadCandidate(candidate, directory, { keys, fetchImpl = fetch }) {
  mkdirSync(directory, { recursive: true });
  const file = path.join(directory, `${candidate.provider}-${String(candidate.assetId).replace(/[^\w-]/g, "")}.mp4`);
  const response = await fetchImpl(candidate.downloadUrl, { signal: AbortSignal.timeout(180_000) });
  if (!response.ok || !response.body) throw new Error(`${candidate.provider} download ${response.status}`);
  try {
    await pipeline(Readable.fromWeb(response.body), createWriteStream(file));
  } catch (error) {
    rmSync(file, { force: true });
    throw error;
  }
  if (!existsSync(file) || statSync(file).size < 50_000) {
    rmSync(file, { force: true });
    throw new Error(`${candidate.provider} clip ${candidate.assetId} is empty`);
  }
  if (candidate.provider === "coverr" && keys.coverr) {
    // Coverr's API terms make this ping mandatory for every downloaded clip.
    try {
      await fetchImpl(`${COVERR_BASE}/videos/${encodeURIComponent(candidate.assetId)}/stats/downloads`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${keys.coverr}` },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {}
  }
  return file;
}

export function fileDigest(file) {
  return `content:${createHash("sha256").update(readFileSync(file)).digest("hex")}`;
}
