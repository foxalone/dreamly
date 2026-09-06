import data from "@emoji-mart/data";
import { init, SearchIndex } from "emoji-mart";
import { pickDreamIconsEn } from "@/lib/dream-icons/dreamIcons.en";

export type DreamMapEmoji = {
  native: string;
  id?: string;
  name?: string;
};

export type DreamMapVisuals = {
  emojis: DreamMapEmoji[];
  iconsEn: string[];
  rootsEn: string[];
};

const STOP = new Set([
  "i",
  "me",
  "my",
  "we",
  "you",
  "he",
  "she",
  "it",
  "they",
  "the",
  "and",
  "or",
  "but",
  "was",
  "were",
  "am",
  "is",
  "are",
  "been",
  "that",
  "this",
  "there",
  "here",
  "then",
  "about",
  "with",
  "from",
  "into",
  "over",
  "under",
  "dream",
  "dreamed",
  "dreaming",
]);

let ready: Promise<void> | null = null;

function ensureIndex() {
  if (!ready) ready = init({ data });
  return ready;
}

function tokensFromText(text: string) {
  const words = (text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((w) => !STOP.has(w));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const word of words) {
    if (seen.has(word)) continue;
    seen.add(word);
    out.push(word);
    if (out.length >= 12) break;
  }
  return out;
}

function nativeOf(row: any) {
  return String(row?.skins?.[0]?.native || row?.native || "").trim();
}

function isGarbageEmoji(row: any) {
  const id = String(row?.id ?? "").toLowerCase();
  const name = String(row?.name ?? "").toLowerCase();
  if (id.startsWith("flag-") || name.includes("flag")) return true;
  if (id.includes("skin-tone")) return true;
  if (id.startsWith("keycap_") || name.includes("keycap")) return true;
  if (name.includes("regional indicator")) return true;
  return false;
}

export async function pickDreamMapVisuals(text: string): Promise<DreamMapVisuals> {
  const cleaned = text.trim();
  const tokens = tokensFromText(cleaned);
  const iconsEn = pickDreamIconsEn(cleaned, 4);

  if (!tokens.length) {
    return { emojis: [], iconsEn, rootsEn: [] };
  }

  await ensureIndex();

  const emojis: DreamMapEmoji[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const results: any[] = await (SearchIndex as any).search(token);
    const hit = (results ?? []).find((row) => row && !isGarbageEmoji(row) && nativeOf(row));
    if (!hit) continue;
    const native = nativeOf(hit);
    if (seen.has(native)) continue;
    seen.add(native);
    emojis.push({
      native,
      id: hit.id,
      name: hit.name,
    });
    if (emojis.length >= 4) break;
  }

  return {
    emojis,
    iconsEn,
    rootsEn: tokens.slice(0, 6),
  };
}
