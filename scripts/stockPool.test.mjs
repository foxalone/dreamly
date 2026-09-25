import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildPickPrompt,
  buildPool,
  expandSearchTerms,
  gatherCandidates,
  heuristicPick,
  normalizeCoverr,
  normalizePexels,
  normalizePixabay,
  normalizeProviders,
  resolvePicks,
} from "./stockPool.mjs";

const pexelsVideo = {
  id: 101,
  url: "https://www.pexels.com/video/black-snake-in-the-grass-101/",
  duration: 12,
  user: { name: "Ann" },
  video_files: [
    { file_type: "video/mp4", width: 1920, height: 1080, link: "https://p/land.mp4" },
    { file_type: "video/mp4", width: 720, height: 1280, link: "https://p/hd.mp4" },
    { file_type: "video/mp4", width: 1080, height: 1920, link: "https://p/fhd.mp4" },
  ],
};
const pixabayHit = {
  id: 202,
  pageURL: "https://pixabay.com/videos/id-202/",
  tags: "snake, reptile, nature",
  duration: 9,
  videos: {
    large: { url: "https://x/l.mp4", width: 1080, height: 1920 },
    medium: { url: "https://x/m.mp4", width: 720, height: 1280 },
  },
};
const coverrHit = {
  id: "abc",
  title: "Snake slithering on rocks",
  description: "Close up",
  tags: ["snake"],
  is_vertical: true,
  max_width: 1080,
  max_height: 1920,
  duration: 8.5,
  urls: { mp4: "https://storage.coverr.co/videos/abc?token=t" },
};

test("normalizers keep only portrait mp4s and pick a ≥1280 rendition", () => {
  const pexels = normalizePexels(pexelsVideo, "snake");
  assert.equal(pexels.downloadUrl, "https://p/hd.mp4");
  assert.equal(pexels.text, "black snake in the grass");
  assert.equal(normalizePixabay(pixabayHit, "snake").height, 1920);
  assert.equal(normalizeCoverr(coverrHit, "snake").provider, "coverr");
  assert.equal(normalizeCoverr({ ...coverrHit, is_vertical: false, max_width: 1920, max_height: 1080 }, "snake"), null);
  assert.equal(normalizePixabay({ ...pixabayHit, videos: { large: { url: "u", width: 1920, height: 1080 } } }, "x"), null);
});

test("providers default to all three and keep canonical order", () => {
  assert.deepEqual(normalizeProviders(undefined), ["pexels", "pixabay", "coverr"]);
  assert.deepEqual(normalizeProviders(["coverr", "pexels", "bogus"]), ["pexels", "coverr"]);
});

test("search terms drop abstract dream words", () => {
  const terms = expandSearchTerms(["dream meaning snake", "snake close up"], "What does dreaming about a snake mean?");
  assert.ok(terms.includes("snake"));
  assert.ok(!terms.some((term) => term.includes("meaning") || term.includes("dream")));
});

test("pool scores relevant, sharp, fresh clips first and drops recent/short ones", () => {
  const relevant = normalizeCoverr(coverrHit, "snake");
  const offTopic = { ...normalizePixabay({ ...pixabayHit, id: 9, tags: "city, traffic" }, "snake") };
  const recent = normalizePexels(pexelsVideo, "snake");
  const short = normalizePexels({ ...pexelsVideo, id: 5, duration: 3 }, "snake");
  const pool = buildPool([offTopic, recent, relevant, short, relevant], {
    scriptWords: new Set(["snake", "rocks"]),
    clipDuration: 5,
    history: { "pexels:101": Date.now() / 1000 },
  });
  assert.equal(pool.length, 3, "duplicate and too-short clips are removed");
  assert.equal(pool[0].key, "coverr:abc");
  assert.equal(pool.at(-1).key, "pexels:101", "recently used clip sinks to the bottom");
});

test("AI picks are mapped back, deduped and topped up from the ranking", () => {
  const shortlist = [1, 2, 3, 4].map((n) => ({ key: `pexels:${n}`, term: `t${n}`, provider: "pexels", score: 5 - n, text: "", width: 1080, height: 1920, duration: 8 }));
  const { chosen, aiCount } = resolvePicks([{ id: "c3", reason: "fits" }, { id: "c3", reason: "dup" }, { id: "c99", reason: "bad" }], shortlist, 3);
  assert.equal(aiCount, 1);
  assert.deepEqual(chosen.map((item) => item.key), ["pexels:3", "pexels:1", "pexels:2"]);
  const prompt = buildPickPrompt("Narration", shortlist, 3);
  assert.match(prompt[1].content, /c4 \| Pexels/);
});

test("heuristic pick limits one search term to two clips while alternatives exist", () => {
  const pool = ["a", "a", "a", "b"].map((term, index) => ({ key: String(index), term, score: 10 - index }));
  assert.deepEqual(heuristicPick(pool, 3).map((item) => item.key), ["0", "1", "3"]);
});

test("gatherCandidates pools every provider and survives a failing one", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "stockpool-"));
  const calls = [];
  const fakeFetch = async (url) => {
    calls.push(url);
    if (url.includes("pexels")) return new Response(JSON.stringify({ videos: [pexelsVideo] }));
    if (url.includes("pixabay")) return new Response(JSON.stringify({ hits: [pixabayHit] }));
    return new Response("limit", { status: 429 });
  };
  try {
    const { candidates, stats } = await gatherCandidates({
      providers: ["pexels", "pixabay", "coverr"],
      terms: ["snake", "grass"],
      keys: { pexels: "p", pixabay: "x", coverr: "c" },
      root,
      fetchImpl: fakeFetch,
    });
    assert.equal(candidates.length, 4);
    assert.match(stats.coverr.error, /^stop:/);
    assert.equal(calls.filter((url) => url.includes("coverr")).length, 1, "stops calling Coverr after 429");
    const again = await gatherCandidates({
      providers: ["pexels", "pixabay"], terms: ["snake"], keys: { pexels: "p", pixabay: "x" }, root, fetchImpl: fakeFetch,
    });
    assert.equal(again.stats.pexels.cached, 1, "second run is served from the 24h cache");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
