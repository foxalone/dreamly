import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "../../_lib/auth";
import { adminDb, seedUid } from "../../_lib/firebaseAdmin";

type CityPick = {
  cityId: string;
  label?: string;
  city?: string;
  country?: string;
  admin1?: string;
  lat?: number | null;
  lng?: number | null;
};

type Body = {
  text?: string;
  city?: CityPick;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toDateKeyLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function toTimeKeyLocal(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function countWords(text: string) {
  const t = (text ?? "").trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}
function makeTitle(text: string) {
  const t = (text ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.length <= 60 ? t : t.slice(0, 60) + "…";
}
function guessLang(text: string): "ru" | "en" | "he" | "unknown" {
  const t = text ?? "";
  const hasHe = /[\u0590-\u05FF]/.test(t);
  const hasCy = /[\u0400-\u04FF]/.test(t);
  const hasLat = /[A-Za-z]/.test(t);
  if (hasHe && !hasCy && !hasLat) return "he";
  if (hasCy && !hasHe) return "ru";
  if (hasLat && !hasHe && !hasCy) return "en";
  return "unknown";
}

function randomInitials() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const a = A[Math.floor(Math.random() * A.length)];
  const b = A[Math.floor(Math.random() * A.length)];
  return a + b;
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);

    const body = (await req.json().catch(() => ({}))) as Body;
    const text = String(body?.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "Empty text" }, { status: 400 });

    const city = body?.city;
    if (!city?.cityId) return NextResponse.json({ error: "Pick a city" }, { status: 400 });

    const now = new Date();
    const uid = seedUid();
    const db = adminDb();

    const payload: any = {
      uid,

      text,
      title: makeTitle(text),

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdAtMs: Date.now(),
      dateKey: toDateKeyLocal(now),
      timeKey: toTimeKeyLocal(now),
      tzOffsetMin: now.getTimezoneOffset(),

      wordCount: countWords(text),
      charCount: text.length,
      langGuess: guessLang(text),

      // visuals placeholders (потом обновим через /update)
      roots: [],
      rootsEn: [],
      rootsTop: [],
      rootsLang: null,
      rootsUpdatedAt: null,

      emojis: [],
      iconsEn: [],

      analysisText: null,
      analysisAtMs: null,
      analysisModel: null,

      shared: false,
      sharedAtMs: null,
      sharedAt: null,

      deleted: false,
      deletedAtMs: null,

      // studio fields
      studio: {
        kind: "tiktok",
        authorInitials: randomInitials(),
        cityLabel: (city.label ?? "").trim() || null,
      },

      // city override (для карты/агрегаций)
      cityId: city.cityId,
      city: (city.city ?? "").trim() || null,
      country: (city.country ?? "").trim() || null,
      admin1: (city.admin1 ?? "").trim() || null,
      lat: Number.isFinite(Number(city.lat)) ? Number(city.lat) : null,
      lng: Number.isFinite(Number(city.lng)) ? Number(city.lng) : null,
    };

    const ref = await db.collection(`users/${uid}/dreams`).add(payload);
    return NextResponse.json({ ok: true, dreamId: ref.id, seedUid: uid });
  } catch (e: any) {
    const msg = e?.message ?? "save failed";
    const code = msg === "FORBIDDEN" ? 403 : msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}