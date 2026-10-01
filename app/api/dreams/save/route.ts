// app/api/dreams/save/route.ts
// Diary save, done on the server: take the slot (subscription day slot or the
// one free save), write users/{uid}/{dreams|stories}/{id}, answer, and then —
// in after() — give the dream its roots, emojis, icons and city. Every saved
// dream gets the full experience, the free first one included, even if the
// user closes the tab right after pressing Save.
import { after, NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { resolveIpCity } from "@/lib/geo/resolveIpCity";
import { DREAM_MAX_CHARS } from "@/lib/subscriptions/plans";
import { countWords } from "@/lib/dreamVisuals";
import { enrichSavedDream } from "@/lib/dreams/enrichSavedDream";
import { adminAuth } from "../../admin/_lib/firebaseAdmin";
import { requireSignedInUid } from "../_lib/requireUser";
import { consumeDreamSlot } from "../_lib/subscription";

export const runtime = "nodejs";
export const maxDuration = 60;

function s(v: unknown) {
  return String(v ?? "").trim();
}

function makeTitle(text: string) {
  const t = text.replace(/\s+/g, " ");
  return t.length <= 60 ? t : t.slice(0, 60) + "…";
}

function guessLang(t: string): "ru" | "en" | "he" | "unknown" {
  const hasHe = /[֐-׿]/.test(t);
  const hasCy = /[Ѐ-ӿ]/.test(t);
  const hasLat = /[A-Za-z]/.test(t);
  if (hasHe && !hasCy && !hasLat) return "he";
  if (hasCy && !hasHe) return "ru";
  if (hasLat && !hasHe && !hasCy) return "en";
  return "unknown";
}

function utcKeys(ms: number) {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    dateKey: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`,
    timeKey: `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = await requireSignedInUid(body?.idToken);
    if ("error" in auth) return auth.error;
    const uid = auth.uid;

    const text = s(body?.text);
    if (!text) return NextResponse.json({ error: "Missing text", code: "EMPTY" }, { status: 400 });
    if (text.length > DREAM_MAX_CHARS) {
      return NextResponse.json({ error: "Dream is too long", code: "TOO_LONG" }, { status: 400 });
    }
    const type: "dream" | "story" = s(body?.type) === "story" ? "story" : "dream";
    const source: "voice" | "manual" = s(body?.source) === "voice" ? "voice" : "manual";

    // Diary save: subscribers use a daily slot, others get one free save ever.
    const slot = await consumeDreamSlot(uid, { allowFreeSave: true });
    if ("error" in slot) return slot.error;

    let authorName: string | null = null;
    let authorEmail: string | null = null;
    try {
      const u = await adminAuth().getUser(uid);
      authorName = s(u.displayName) || null;
      authorEmail = s(u.email) || null;
    } catch {
      // keep nulls
    }

    const nowMs = Date.now();
    const fallback = utcKeys(nowMs);
    const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(s(body?.dateKey)) ? s(body.dateKey) : fallback.dateKey;
    const timeKey = /^\d{2}:\d{2}$/.test(s(body?.timeKey)) ? s(body.timeKey) : fallback.timeKey;
    const tz = Number(body?.tzOffsetMin);
    const ts = admin.firestore.FieldValue.serverTimestamp();

    const db = adminFirestore();
    const ref = db
      .collection("users")
      .doc(uid)
      .collection(type === "story" ? "stories" : "dreams")
      .doc();

    await ref.set({
      uid,
      text,
      title: makeTitle(text),
      createdAt: ts,
      updatedAt: ts,
      createdAtMs: nowMs,
      dateKey,
      timeKey,
      tzOffsetMin: Number.isFinite(tz) ? tz : 0,
      wordCount: countWords(text),
      charCount: text.length,
      langGuess: guessLang(text),
      tags: [],
      summary: "",
      source,
      deleted: false,
      emojis: [],
      iconsEn: [],
      shared: false,
      sharedAtMs: null,
      sharedAt: null,
      roots: [],
      rootsTop: [],
      rootsEn: [],
      rootsLang: null,
      rootsUpdatedAt: null,
      sourceType: type,
      ownerUid: uid,
      authorName,
      authorEmail,
      savedVia: "server",
    });

    // The city comes from the request that saved the dream (Vercel geo headers),
    // so resolve it now, while the request is ours.
    const ipCity = await resolveIpCity(req).catch(() => null);
    const baseUrl = req.url;

    after(async () => {
      try {
        await enrichSavedDream({ uid, itemId: ref.id, sourceType: type, ipCity, baseUrl });
      } catch (e) {
        console.error("enrichSavedDream failed", { uid, itemId: ref.id, e });
      }
    });

    return NextResponse.json({
      ok: true,
      id: ref.id,
      type,
      free: slot.free === true,
      remaining: slot.remaining,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
