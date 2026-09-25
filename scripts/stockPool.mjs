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
const MIN_PORTRAIT_HEIGHT = 960;
const MIN_CROP_SOURCE_HEIGHT = 1080; // landscape clips are centre-cropped to 9:16
const CACHE_VERSION = "v2";
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

function slugText(url) {
  const match = /\/video\/([^/]+?)(?:-\d+)?\/?$/.exec(String(url ?? ""));
  return match ? match[1].replace(/-/g, " ") : "";
}

export function normalizePexels(video, term) {
  const files = (video?.video_files ?? []).filter((file) =>
    String(file.file_type ?? "").includes("mp4") && Number(file.height) > Number(file.width) && file.link);
  if (!files.length) return null;
  const sorted = [...files].sort((a, b) => a.height - b.height);
  const file = sorted.find((item) => item.height >= 1280) ?? sorted[sorted.length - 1];
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

export function normalizePixabay(hit, term) {
  const variants = ["large", "medium", "small"].map((size) => hit?.videos?.[size]).filter((item) => item?.url);
  const portrait = variants.filter((item) => Number(item.height) > Number(item.width));
  let file = portrait.find((item) => item.height >= 1280 && item.height <= 2160) ?? portrait[0];
  let crop = false;
  if (!file) {
    // Mostly-landscape library: take the sharpest ≤4K rendition and crop it to 9:16.
    file = variants.find((item) => item.height >= MIN_CROP_SOURCE_HEIGHT && item.height <= 2160);
    if (!file) return null;
    crop = true;
  }
  return {
    provider: "pixabay",
    assetId: String(hit.id),
    text: String(hit.tags ?? ""),
    ...croppedSize(Number(file.width), Number(file.height), crop),
    crop,
    duration: Number(hit.duration) || 0,
    downloadUrl: String(file.url),
    sourcePage: String(hit.pageURL ?? "https://pixabay.com"),
    author: String(hit.user ?? ""),
    term,
  };
}

export function normalizeCoverr(hit, term) {
  const width = Number(hit?.max_width) || 0;
  const height = Number(hit?.max_height) || 0;
  const vertical = hit?.is_vertical === true || height > width;
  const url = hit?.urls?.mp4;
  if (!url) return null;
  // Coverr is ~95% landscape; without cropping it contributes almost nothing.
  const crop = !vertical;
  if (crop && height < MIN_CROP_SOURCE_HEIGHT) return null;
  return {
    provider: "coverr",
    assetId: String(hit.id),
    text: [hit.title, hit.description, ...(Array.isArray(hit.tags) ? hit.tags : [])].filter(Boolean).join(" · "),
    ...croppedSize(width, height, crop),
    crop,
    duration: Number(hit.duration) || 0,
    downloadUrl: String(url),
    sourcePage: `https://coverr.co/videos/${hit.id}`,
    author: "",
    term,
  };
}

/** Size of the 9:16 frame we actually get (a centre crop keeps the full height). */
export function croppedSize(width, height, crop) {
  return crop ? { width: Math.round((height * 9) / 16), height } : { width, height };
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
  const quality = Math.min(1, candidate.height / 1920) * 2.5 + (candidate.height >= 1280 ? 0.5 : 0);
  const fit = candidate.duration >= clipDuration ? Math.min(1.5, 0.75 + (candidate.duration - clipDuration) / 20) : -3;
  const recent = history[candidateKey(candidate)] ? -4 : 0;
  const cropCost = candidate.crop ? -0.75 : 0; // crop loses the frame edges and some sharpness
  return Math.round((relevance + quality + fit + recent + cropCost) * 100) / 100;
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
    if (candidate.height < MIN_PORTRAIT_HEIGHT || candidate.duration < (options.clipDuration ?? 5)) continue;
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

/**
 * Shortlist for the model: every library gets a fair share of slots (its own
 * best clips) so one big library can't crowd the others out, then the rest is
 * filled by overall score.
 */
export function balancedShortlist(pool, size) {
  const providers = [...new Set(pool.map((item) => item.provider))];
  const share = Math.max(1, Math.floor(size / Math.max(1, providers.length)));
  const picked = [];
  for (const provider of providers) {
    picked.push(...heuristicPick(pool.filter((item) => item.provider === provider), share));
  }
  for (const candidate of pool) {
    if (picked.length >= size) break;
    if (!picked.includes(candidate)) picked.push(candidate);
  }
  return picked.slice(0, size).sort((a, b) => b.score - a.score);
}

/**
 * Every library that has a competitive clip gets at least one slot: its best
 * shortlisted clip replaces the weakest pick of the most-used library.
 */
export function ensureProviderMix(chosen, shortlist, { tolerance = 1.5 } = {}) {
  const result = [...chosen];
  if (!result.length) return result;
  const providers = [...new Set(shortlist.map((item) => item.provider))];
  for (const provider of providers) {
    if (result.some((item) => item.provider === provider)) continue;
    const best = shortlist.find((item) => item.provider === provider && !result.some((pick) => pick.key === item.key));
    if (!best) continue;
    const counts = result.reduce((acc, item) => ({ ...acc, [item.provider]: (acc[item.provider] ?? 0) + 1 }), {});
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!dominant || dominant[1] < 2) continue;
    let weakest = -1;
    result.forEach((item, index) => {
      if (item.provider === dominant[0] && (weakest < 0 || item.score < result[weakest].score)) weakest = index;
    });
    if (weakest < 0 || best.score < result[weakest].score - tolerance) continue;
    result[weakest] = { ...best, reason: best.reason || "mixed in: best clip from this library" };
  }
  return result;
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

export function buildPickPrompt(script, shortlist, count) {
  const lines = shortlist.map((candidate, index) =>
    `c${index + 1} | ${PROVIDER_LABELS[candidate.provider]} | ${Math.round(candidate.duration)}s | ${candidate.width}x${candidate.height} | ` +
    `found by "${candidate.term}"${candidate.crop ? " | landscape, will be cropped to 9:16" : ""} | ${String(candidate.text || "(no description)").slice(0, 160)}`);
  return [
    {
      role: "system",
      content:
        "You are a Shorts video editor. From a pool of vertical stock clips gathered from several free libraries, " +
        `choose exactly ${count} different clips and put them in the order they should appear under the narration. ` +
        "Judge each clip only by its description, resolution and length. Prefer clips that literally show what the narration " +
        "says at that moment, then higher resolution. Keep the sequence visually varied (no near-duplicates back to back). " +
        "The pool mixes several libraries: when a library has a clip that fits, use at least one clip from it so the Short " +
        "does not look like one stock site. Never pick an off-topic clip just for variety. Reasons: max 12 words.",
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

function cachePath(root, provider, term) {
  const digest = createHash("sha256").update(`${CACHE_VERSION}:${provider}:${term}`).digest("hex").slice(0, 24);
  return path.join(root, "storage", "stock_pool_cache", `${provider}-${digest}.json`);
}

function readCache(root, provider, term) {
  const file = cachePath(root, provider, term);
  try {
    if (Date.now() - statSync(file).mtimeMs > SEARCH_CACHE_TTL_MS) return null;
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeCache(root, provider, term, items) {
  const file = cachePath(root, provider, term);
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

export async function searchProvider(provider, term, { keys, fetchImpl = fetch }) {
  const q = encodeURIComponent(term);
  if (provider === "pexels") {
    const payload = await getJson(fetchImpl,
      `https://api.pexels.com/videos/search?query=${q}&orientation=portrait&size=medium&per_page=40`,
      { Authorization: keys.pexels });
    return (payload.videos ?? []).map((video) => normalizePexels(video, term)).filter(Boolean);
  }
  if (provider === "pixabay") {
    const payload = await getJson(fetchImpl,
      `https://pixabay.com/api/videos/?key=${encodeURIComponent(keys.pixabay)}&q=${q}&per_page=50&safesearch=true`);
    return (payload.hits ?? []).map((hit) => normalizePixabay(hit, term)).filter(Boolean);
  }
  if (provider === "coverr") {
    const payload = await getJson(fetchImpl,
      `${COVERR_BASE}/videos?query=${q}&page_size=50&urls=true`,
      { Authorization: `Bearer ${keys.coverr}` });
    return (payload.hits ?? []).map((hit) => normalizeCoverr(hit, term)).filter(Boolean);
  }
  throw new Error(`Unknown stock provider ${provider}`);
}

/**
 * Search every enabled provider for every term. A failing provider (bad key,
 * Coverr's 50 req/h demo limit) is logged and skipped, never fatal on its own.
 */
export async function gatherCandidates({ providers, terms, keys, root, log = () => {}, fetchImpl = fetch, coverrSearchBudget = 5 }) {
  const all = [];
  const stats = Object.fromEntries(providers.map((provider) => [provider, { searches: 0, cached: 0, found: 0, error: "" }]));
  let coverrLeft = coverrSearchBudget;
  for (const term of terms) {
    for (const provider of providers) {
      const stat = stats[provider];
      if (!keys[provider] || stat.error.startsWith("stop:")) continue;
      let items = root ? readCache(root, provider, term) : null;
      if (items) stat.cached += 1;
      else {
        if (provider === "coverr" && coverrLeft <= 0) continue;
        try {
          if (provider === "coverr") coverrLeft -= 1;
          stat.searches += 1;
          items = await searchProvider(provider, term, { keys, fetchImpl });
          if (root) writeCache(root, provider, term, items);
        } catch (error) {
          const status = error?.status;
          stat.error = `${[401, 403, 429].includes(status) ? "stop:" : ""}${error.message}`;
          log(`stock pool ${provider} "${term}" failed: ${error.message}`);
          continue;
        }
      }
      stat.found += items.length;
      all.push(...items);
      log(`stock pool ${provider} "${term}" → ${items.length} portrait clips`);
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
