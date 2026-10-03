// app/api/map/emoji-symbol/route.ts
// Map popup → "what does this emoji mean in a dream": finds the dictionary symbol for an emoji.
// 1) a top-level dictionary symbol with that exact icon; 2) the emoji's name/keywords
// (@emoji-mart/data) matched against the dictionary; 3) otherwise a dictionary search query.

import { NextResponse } from "next/server";
import emojiData from "@emoji-mart/data";
import { PARENT_DREAMS } from "@/lib/dream-dictionary";
import { findBestDreamMatch } from "@/lib/quickSymbol";
import { normalizeEmojiKey, type EmojiDataLike } from "@/lib/dreamEmojiResolve";

export const runtime = "nodejs";

type Result = { slug: string | null; query: string };

const byIcon = new Map<string, string>();
for (const e of PARENT_DREAMS) {
  if (e.comboOf) continue;
  const k = normalizeEmojiKey(e.icon);
  if (k && !byIcon.has(k)) byIcon.set(k, e.slug);
}

const byNative = new Map<string, { name: string; keywords: string[] }>();
for (const row of Object.values((emojiData as EmojiDataLike).emojis ?? {})) {
  const native = row?.skins?.[0]?.native;
  if (!native) continue;
  const k = normalizeEmojiKey(native);
  if (!byNative.has(k)) byNative.set(k, { name: String(row.name ?? ""), keywords: row.keywords ?? [] });
}

const cache = new Map<string, Result>();

function resolve(raw: string): Result {
  const key = normalizeEmojiKey(raw);
  const hit = cache.get(key);
  if (hit) return hit;

  const meta = byNative.get(key);
  const name = (meta?.name ?? "").toLowerCase();
  let out: Result = { slug: byIcon.get(key) ?? null, query: name };

  if (!out.slug && meta) {
    let best: { slug: string; score: number } | null = null;
    for (const q of [name, ...meta.keywords.slice(0, 3)]) {
      const m = q ? findBestDreamMatch(q) : null;
      if (m && (!best || m.score > best.score)) best = { slug: m.slug, score: m.score };
    }
    if (best) out = { slug: best.slug, query: name };
  }

  cache.set(key, out);
  return out;
}

export async function GET(req: Request) {
  const e = new URL(req.url).searchParams.get("e") ?? "";
  if (!e || e.length > 32) return NextResponse.json({ slug: null, query: "" }, { status: 400 });
  return NextResponse.json(resolve(e), {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
