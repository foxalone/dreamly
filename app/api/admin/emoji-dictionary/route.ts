import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { ALL_DREAM_ENTRIES, getDreamEntry } from "@/lib/dream-dictionary";
import { extractEmojiGraphemes, normalizeEmojiKey } from "@/lib/dreamEmojiResolve";
import { dreamMapDictionaryRows, EMOJI_DICTIONARY_LINKS_COLLECTION, resolveEmojiDictionary } from "@/lib/emojiDictionary";
import { requireAdmin } from "../_lib/auth";
import { adminDb } from "../_lib/firebaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const [snapshot, cities] = await Promise.all([
      adminDb().collection(EMOJI_DICTIONARY_LINKS_COLLECTION).get(),
      adminDb().collection("city_emoji_stats").limit(5000).get(),
    ]);
    const links = new Map(snapshot.docs.map((doc) => [doc.id, String(doc.get("slug") || "")]));
    const rows = dreamMapDictionaryRows(cities.docs.map((doc) => doc.data()), links);
    return NextResponse.json({ rows, articles: ALL_DREAM_ENTRIES.map(({ slug, title }) => ({ slug, title })) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) { return failure(error); }
}

/** Only links to articles already present in the published dictionary are accepted. */
export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    const body = await req.json();
    const emoji = typeof body.emoji === "string" ? body.emoji : "";
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const key = normalizeEmojiKey(emoji);
    const graphemes = extractEmojiGraphemes(emoji);
    if (emoji.length > 32 || graphemes.length !== 1 || normalizeEmojiKey(graphemes[0]) !== key || (slug && !getDreamEntry(slug))) {
      return NextResponse.json({ error: "INVALID_ARTICLE_OR_EMOJI" }, { status: 400 });
    }
    const reference = adminDb().collection(EMOJI_DICTIONARY_LINKS_COLLECTION).doc(key);
    if (slug) {
      await reference.set({ emoji, slug, updatedBy: uid, updatedAt: FieldValue.serverTimestamp() });
    } else {
      await reference.delete();
    }
    return NextResponse.json({ ...resolveEmojiDictionary(emoji, slug), manual: Boolean(slug) });
  } catch (error) { return failure(error); }
}
