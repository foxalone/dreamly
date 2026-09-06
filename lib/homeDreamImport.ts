import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { firestore } from "@/lib/firebase";
import { trackEvent } from "@/lib/analytics";
import { pickDreamMapVisuals, type DreamMapVisuals } from "@/lib/dream-map/pickDreamMapVisuals";
import { ingestDreamForMap } from "@/lib/map/ingestDreamForMap";
import {
  clearHomeDreamPending,
  HOME_DREAM_MAX_CHARS,
  readHomeDreamPending,
  type HomeDreamCity,
  type HomeDreamPending,
} from "@/lib/homeDreamPending";

export type HomeDreamImportResult =
  | { status: "empty" }
  | { status: "imported"; dreamId: string; shared: boolean; analysis?: string }
  | { status: "failed"; pendingText: string; error: unknown };

let inFlight: Promise<HomeDreamImportResult> | null = null;

function makeTitle(text: string) {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.length <= 60 ? t : `${t.slice(0, 60)}…`;
}

function guessLang(text: string): "ru" | "en" | "he" | "unknown" {
  const hasHe = /[\u0590-\u05FF]/.test(text);
  const hasCy = /[\u0400-\u04FF]/.test(text);
  const hasLat = /[A-Za-z]/.test(text);
  if (hasHe && !hasCy && !hasLat) return "he";
  if (hasCy && !hasHe) return "ru";
  if (hasLat && !hasHe && !hasCy) return "en";
  return "unknown";
}

function countWords(text: string) {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKeyLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toTimeKeyLocal(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function visualsFromPending(pending: HomeDreamPending): DreamMapVisuals {
  return {
    emojis: Array.isArray(pending.emojis) ? pending.emojis.filter((item) => item?.native) : [],
    iconsEn: Array.isArray(pending.iconsEn) ? pending.iconsEn.map(String).filter(Boolean) : [],
    rootsEn: Array.isArray(pending.rootsEn) ? pending.rootsEn.map(String).filter(Boolean) : [],
  };
}

async function resolveImportCity(pending: HomeDreamPending): Promise<HomeDreamCity | undefined> {
  if (pending.city?.cityId) return pending.city;
  try {
    const res = await fetch("/api/geo/ip-city", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) return undefined;
    const cityId = String(data?.cityId ?? "").trim();
    const city = String(data?.city ?? "").trim();
    const country = String(data?.country ?? "").trim();
    const admin1 = String(data?.admin1 ?? "").trim();
    if (!cityId || !city || !country) return undefined;
    return { cityId, city, country, admin1 };
  } catch {
    return undefined;
  }
}

async function resolveVisuals(pending: HomeDreamPending): Promise<DreamMapVisuals> {
  const cached = visualsFromPending(pending);
  if (cached.emojis.length > 0) return cached;
  return pickDreamMapVisuals(pending.text).catch(() => cached);
}

async function shareImportedDream(user: User, dreamId: string, pending: HomeDreamPending, visuals: DreamMapVisuals) {
  const nowMs = Date.now();
  const sharedId = `${user.uid}_${dreamId}`;
  const text = pending.text;

  await updateDoc(doc(firestore, "users", user.uid, "dreams", dreamId), {
    shared: true,
    sharedAtMs: nowMs,
    sharedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(firestore, "shared_dreams", sharedId), {
    ownerUid: user.uid,
    ownerDreamId: dreamId,
    ownerStoryId: null,
    sourceType: "dream",
    authorName: null,
    authorEmail: null,
    title: makeTitle(text),
    text,
    dateKey: toDateKeyLocal(new Date()),
    timeKey: toTimeKeyLocal(new Date()),
    createdAtMs: pending.createdAtMs ?? nowMs,
    wordCount: countWords(text),
    charCount: text.length,
    langGuess: pending.lang || guessLang(text),
    source: "manual",
    iconsEn: visuals.iconsEn,
    emojis: visuals.emojis,
    sharedAtMs: nowMs,
    sharedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deleted: false,
    reactions: { heart: 0, like: 0, star: 0 },
    fromHomeAsk: true,
    ...(pending.city?.cityId
      ? {
          cityId: pending.city.cityId,
          city: pending.city.city,
          country: pending.city.country,
          admin1: pending.city.admin1 || null,
          citySource: "ip",
        }
      : {}),
  });

  trackEvent("share", { method: "home_ask_map", content_type: "dream" });
}

async function importOnce(user: User): Promise<HomeDreamImportResult> {
  const pending = readHomeDreamPending();
  const text = pending?.text.trim() ?? "";
  if (!pending || !text) return { status: "empty" };

  const now = new Date();
  const analysis = pending.analysis?.trim() || "";
  const nowMs = Date.now();
  const visuals = pending.shareToMap !== false ? await resolveVisuals(pending) : visualsFromPending(pending);
  const city = pending.shareToMap !== false ? await resolveImportCity(pending) : pending.city;

  try {
    const docRef = await addDoc(collection(firestore, "users", user.uid, "dreams"), {
      uid: user.uid,
      text: text.slice(0, HOME_DREAM_MAX_CHARS),
      title: makeTitle(text),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAtMs: pending.createdAtMs || nowMs,
      dateKey: toDateKeyLocal(now),
      timeKey: toTimeKeyLocal(now),
      tzOffsetMin: now.getTimezoneOffset(),
      wordCount: countWords(text),
      charCount: text.length,
      langGuess: pending.lang || guessLang(text),
      tags: [] as string[],
      summary: "",
      source: "manual" as const,
      deleted: false,
      emojis: visuals.emojis,
      iconsEn: visuals.iconsEn,
      shared: false,
      sharedAtMs: null,
      sharedAt: null,
      roots: visuals.rootsEn,
      rootsTop: [] as { w: string; c: number }[],
      rootsEn: visuals.rootsEn,
      rootsLang: pending.lang || null,
      rootsUpdatedAt: visuals.rootsEn.length ? serverTimestamp() : null,
      sourceType: "dream",
      ownerUid: user.uid,
      authorName: (user.displayName ?? "").trim() || null,
      authorEmail: (user.email ?? "").trim() || null,
      fromHomeAsk: true,
      ...(city
        ? {
            cityId: city.cityId,
            city: city.city,
            country: city.country,
            admin1: city.admin1 || null,
            citySource: "ip",
          }
        : {}),
      ...(analysis
        ? {
            analysisText: analysis,
            analysisAtMs: nowMs,
            analysisModel: "home_ask",
            analysisLens: pending.lens || null,
          }
        : {}),
    });

    clearHomeDreamPending();

    if (pending.shareToMap !== false) {
      try {
        await shareImportedDream(user, docRef.id, { ...pending, city: city ?? pending.city }, visuals);
      } catch (e) {
        console.warn("home dream map share failed", e);
      }
      if (visuals.emojis.length > 0) {
        try {
          await ingestDreamForMap({
            uid: user.uid,
            dreamId: docRef.id,
            sourceType: "dream",
            skipCity: pending.guestMapIngested === true,
          });
        } catch (e) {
          console.warn("home dream map ingest failed", e);
        }
      }
    }

    trackEvent("journal_entry_saved", {
      content_type: "dream",
      input_method: "home_ask",
      word_count: countWords(text),
      shared_to_map: pending.shareToMap !== false,
    });

    return {
      status: "imported",
      dreamId: docRef.id,
      shared: pending.shareToMap !== false,
      analysis: analysis || undefined,
    };
  } catch (error) {
    return { status: "failed", pendingText: text, error };
  }
}

export function importHomeDreamPending(user: User): Promise<HomeDreamImportResult> {
  if (inFlight) return inFlight;
  inFlight = importOnce(user).finally(() => {
    inFlight = null;
  });
  return inFlight;
}
