import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { firestore } from "@/lib/firebase";
import { trackEvent } from "@/lib/analytics";
import {
  clearHomeDreamPending,
  HOME_DREAM_MAX_CHARS,
  readHomeDreamPending,
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

async function shareImportedDream(user: User, dreamId: string, pending: HomeDreamPending) {
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
    iconsEn: [],
    emojis: [],
    sharedAtMs: nowMs,
    sharedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deleted: false,
    reactions: { heart: 0, like: 0, star: 0 },
    fromHomeAsk: true,
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
      emojis: [] as { native: string }[],
      iconsEn: [] as string[],
      shared: false,
      sharedAtMs: null,
      sharedAt: null,
      roots: [] as string[],
      rootsTop: [] as { w: string; c: number }[],
      rootsEn: [] as string[],
      rootsLang: null,
      rootsUpdatedAt: null,
      sourceType: "dream",
      ownerUid: user.uid,
      authorName: (user.displayName ?? "").trim() || null,
      authorEmail: (user.email ?? "").trim() || null,
      fromHomeAsk: true,
      ...(analysis
        ? {
            analysisText: analysis,
            analysisAtMs: nowMs,
            analysisModel: "home_ask",
          }
        : {}),
    });

    clearHomeDreamPending();

    if (pending.shareToMap) {
      try {
        await shareImportedDream(user, docRef.id, pending);
      } catch (e) {
        console.warn("home dream map share failed", e);
      }
    }

    trackEvent("journal_entry_saved", {
      content_type: "dream",
      input_method: "home_ask",
      word_count: countWords(text),
      shared_to_map: pending.shareToMap === true,
    });

    return {
      status: "imported",
      dreamId: docRef.id,
      shared: pending.shareToMap === true,
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
