import { findBestDreamMatch } from "@/lib/quickSymbol";
import { normalizeMatchText } from "@/lib/searchMatching";

export type GscVideoCandidate = {
  id: string;
  topic: string;
  title: string;
};

export type GscVideoMatch = {
  id: string;
  title: string;
  topic: string;
};

const FILLERS = [
  "what does it mean to dream",
  "what does dreaming about a",
  "what does dreaming about",
  "what does dreaming of a",
  "what does dreaming of",
  "what does a dream about",
  "islamic interpretation",
  "biblical interpretation",
  "spiritual interpretation",
  "biblical meaning",
  "spiritual meaning",
  "dream meaning",
  "dreams meaning",
  "in my dream",
  "in a dream",
  "in dream",
  "dreaming about a",
  "dreaming about",
  "dreaming of a",
  "dreaming of",
  "dream about a",
  "dream about",
  "dream of a",
  "dream of",
  "dreams about",
  "what does",
  "what do",
  "meaning of",
  "interpretation",
  "islamic",
  "islam",
  "biblical",
  "spiritual",
  "meaning",
  "mean",
  "dreams",
  "dream",
];

function singularizeToken(token: string) {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith("ses")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

export function singularizePhrase(value: string) {
  return normalizeMatchText(value).split(" ").filter(Boolean).map(singularizeToken).join(" ");
}

export function stripDreamSearchFiller(value: string) {
  let text = ` ${normalizeMatchText(value)} `;
  let previous = "";
  while (text !== previous) {
    previous = text;
    for (const filler of FILLERS) {
      text = text.replaceAll(` ${filler} `, " ");
    }
    text = text.replace(/\s+/g, " ");
  }
  return text.trim();
}

export function gscQueryCore(value: string) {
  return singularizePhrase(stripDreamSearchFiller(value));
}

export function dictionarySlugFor(text: string) {
  const variants = [text, stripDreamSearchFiller(text), gscQueryCore(text)].filter(Boolean);
  let bestSlug: string | null = null;
  let bestScore = 0;
  for (const variant of variants) {
    const match = findBestDreamMatch(variant);
    if (match && match.score > bestScore) {
      bestScore = match.score;
      bestSlug = match.slug;
    }
  }
  return bestSlug;
}

type IndexedVideo = {
  video: GscVideoCandidate;
  core: string;
  slug: string | null;
};

function indexVideoCandidate(video: GscVideoCandidate): IndexedVideo {
  const haystack = `${video.topic} ${video.title}`.trim();
  return {
    video,
    core: gscQueryCore(haystack),
    slug: dictionarySlugFor(haystack),
  };
}

function tokens(value: string) {
  return value.split(" ").filter(Boolean);
}

function queryCoveredByVideo(queryCore: string, videoCore: string) {
  if (!queryCore) return true;
  if (!videoCore) return false;
  if (queryCore === videoCore) return true;
  const videoTokens = new Set(tokens(videoCore));
  return tokens(queryCore).every((token) => videoTokens.has(token));
}

function matchIndexedQuery(query: string, videos: IndexedVideo[]): GscVideoMatch | null {
  const queryCore = gscQueryCore(query);
  const querySlug = dictionarySlugFor(query);
  if (!queryCore && !querySlug) return null;

  for (const item of videos) {
    const sameCore = Boolean(queryCore && item.core && queryCore === item.core);
    const sameSlug = Boolean(querySlug && item.slug && querySlug === item.slug);
    if (!sameCore && !sameSlug) continue;
    if (sameSlug && !queryCoveredByVideo(queryCore, item.core)) continue;
    return {
      id: item.video.id,
      title: item.video.title || item.video.topic,
      topic: item.video.topic,
    };
  }
  return null;
}

export function matchGscQueryToVideo(query: string, videos: GscVideoCandidate[]): GscVideoMatch | null {
  return matchIndexedQuery(query, videos.map(indexVideoCandidate));
}

export function attachVideosToGscQueries<T extends { query: string }>(
  rows: T[],
  videos: GscVideoCandidate[],
) {
  const indexed = videos.map(indexVideoCandidate);
  return rows.map((row) => ({
    ...row,
    video: matchIndexedQuery(row.query, indexed),
  }));
}
