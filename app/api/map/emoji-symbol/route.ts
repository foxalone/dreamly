import { NextResponse } from "next/server";
import { normalizeEmojiKey } from "@/lib/dreamEmojiResolve";
import { EMOJI_DICTIONARY_LINKS_COLLECTION, resolveEmojiDictionary } from "@/lib/emojiDictionary";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const emoji = new URL(req.url).searchParams.get("e") || "";
  if (!emoji.trim() || emoji.length > 32) return NextResponse.json({ slug: null, query: "" }, { status: 400 });
  let linkedSlug: string | undefined;
  try {
    const link = await adminDb().collection(EMOJI_DICTIONARY_LINKS_COLLECTION).doc(normalizeEmojiKey(emoji)).get();
    linkedSlug = link.get("slug");
  } catch (error) {
    // A storage outage must not remove the existing dictionary fallback from the map.
    console.error("[map/emoji-symbol] Unable to read article link", error);
  }
  return NextResponse.json(resolveEmojiDictionary(emoji, linkedSlug), {
    headers: { "Cache-Control": "no-store" },
  });
}
