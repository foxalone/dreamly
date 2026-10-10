// app/api/map/emoji-dreams/route.ts
// Map popup → "dreams that got this icon": the latest public feed dreams whose
// emojis include the tapped one. The feed deep-links them as /app/shared?dream=<id>.

import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/** Compare emojis without the variation selector (🐍︎ vs 🐍). */
const strip = (s: string) => s.replace(/️/g, "");

const MAX_ROWS = 4;
const SCAN = 120;

export async function GET(req: Request) {
  const e = new URL(req.url).searchParams.get("e") ?? "";
  if (!e || e.length > 32) return NextResponse.json({ dreams: [] }, { status: 400 });
  const key = strip(e.trim());

  const snap = await adminFirestore().collection("shared_dreams").orderBy("sharedAtMs", "desc").limit(SCAN).get();
  const dreams: { id: string; snippet: string }[] = [];
  for (const doc of snap.docs) {
    const x = doc.data();
    const text = String(x.text ?? "").trim();
    if (!text) continue; // author-deleted docs keep a stripped shell — never link them
    const emojis = Array.isArray(x.emojis) ? x.emojis : [];
    const has = emojis.some((em: { native?: string }) => typeof em?.native === "string" && strip(em.native) === key);
    if (!has) continue;
    dreams.push({ id: doc.id, snippet: text.length > 64 ? `${text.slice(0, 64).trimEnd()}…` : text });
    if (dreams.length >= MAX_ROWS) break;
  }

  return NextResponse.json(
    { dreams },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } }
  );
}
