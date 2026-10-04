import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { firestore } from "@/lib/firebase";
import { trackEvent } from "@/lib/analytics";
import { pickDreamMapVisuals, type DreamMapVisuals } from "@/lib/dream-map/pickDreamMapVisuals";
import { ingestDreamForMap } from "@/lib/map/ingestDreamForMap";
import { requestSharedDreamLang } from "@/lib/requestSharedDreamLang";
import { clampDreamText } from "@/lib/dreamLength";
import { countMySharedDreams } from "@/lib/mySharedDreamsCount";
import { shareBadgeFor } from "@/lib/shareBadges";
import {
  takeHomeDreamPending,
  writeHomeDreamPending,
  type HomeDreamCity,
  type HomeDreamPending,
} from "@/lib/homeDreamPending";

export type HomeDreamImportResult =
  | { status: "empty" }
  | {
      status: "imported";
      dreamId: string;
      shared: boolean;
      analysis?: string;
      /** Shared dreams the account has after this import (null = unknown), for the level-up toast. */
      shareCount?: number | null;
    }
  | { status: "failed"; pendingText: string; error: unknown }
  /** Free saves for today are used up — the cache is kept, show the paywall. */
  | { status: "save_limit" };

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

async function shareImportedDream(
  user: User,
  dreamId: string,
  pending: HomeDreamPending,
  visuals: DreamMapVisuals
): Promise<number | null> {
  const before = await countMySharedDreams(user.uid);
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
    ...(before !== null ? { shareBadge: shareBadgeFor(before + 1).id } : {}),
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

  requestSharedDreamLang(user, sharedId);

  trackEvent("share", { method: "home_ask_map", content_type: "dream" });
  return before === null ? null : before + 1;
}

/**
 * The guest already shared this dream anonymously (shared_dreams/guest_{id}).
 * Move that doc to the account instead of publishing a second copy.
 * Returns the account's shared count, or false when there was nothing to claim
 * (other browser, already claimed) and the caller should share normally.
 */
async function claimGuestShare(user: User, dreamId: string): Promise<number | null | false> {
  const idToken = await user.getIdToken();
  const res = await fetch("/api/dreams/claim-guest-share", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, dreamId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok !== true) return false;

  const sharedAtMs = Number(data.sharedAtMs) || Date.now();
  await updateDoc(doc(firestore, "users", user.uid, "dreams", dreamId), {
    shared: true,
    sharedAtMs,
    sharedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  trackEvent("share", { method: "guest_claimed", content_type: "dream" });
  const count = Number(data.count);
  return Number.isFinite(count) ? count : null;
}

function restorePending(pending: HomeDreamPending) {
  writeHomeDreamPending(pending.text, {
    analysis: pending.analysis ?? "",
    shareToFeed: pending.shareToFeed,
    lang: pending.lang,
    lens: pending.lens,
    createdAtMs: pending.createdAtMs,
    emojis: pending.emojis,
    iconsEn: pending.iconsEn,
    rootsEn: pending.rootsEn,
    city: pending.city,
    guestMapIngested: pending.guestMapIngested,
    guestSharedId: pending.guestSharedId,
  });
}

async function importOnce(user: User): Promise<HomeDreamImportResult> {
  // Claim the cache before the first await. The localStorage entry is the only
  // lock shared between tabs and page loads, and everything below (visuals, geo,
  // the Firestore round-trip) is slow enough for a second context to start the
  // very same import and write a duplicate dream.
  const pending = takeHomeDreamPending();
  const text = pending?.text.trim() ?? "";
  if (!pending || !text) return { status: "empty" };

  const now = new Date();
  const analysis = pending.analysis?.trim() || "";
  const nowMs = Date.now();
  const createdAtMs = pending.createdAtMs || nowMs;
  // Deterministic id: re-running the import overwrites the same dream instead of
  // adding another one.
  const dreamId = `home_${createdAtMs}`;
  // Every dream goes on the map (anonymously, emojis only); the feed share is the visitor's choice.
  // Same save rule as the journal (5 free a day per network, then an ad):
  // take the slot on the server before writing.
  try {
    const idToken = await user.getIdToken();
    const slot = await fetch("/api/dreams/consume-slot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!slot.ok) {
      const data = await slot.json().catch(() => ({}));
      restorePending(pending);
      if (data?.code === "SAVE_IP_LIMIT") return { status: "save_limit" };
      return { status: "failed", pendingText: text, error: new Error(String(data?.error ?? "save slot failed")) };
    }
  } catch (error) {
    restorePending(pending);
    return { status: "failed", pendingText: text, error };
  }

  const visuals = await resolveVisuals(pending);
  const city = await resolveImportCity(pending);

  try {
    await setDoc(doc(firestore, "users", user.uid, "dreams", dreamId), {
      uid: user.uid,
      text: clampDreamText(text).trim(),
      title: makeTitle(text),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAtMs,
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

    // An explicit anonymous share as a guest counts even with the map box unticked.
    const wantsShare = pending.shareToFeed !== false || !!pending.guestSharedId;
    let shareCount: number | null | undefined;
    if (wantsShare) {
      try {
        const claimed = pending.guestSharedId ? await claimGuestShare(user, dreamId).catch(() => false as const) : false;
        shareCount =
          claimed !== false
            ? claimed
            : await shareImportedDream(user, dreamId, { ...pending, city: city ?? pending.city }, visuals);
      } catch (e) {
        console.warn("home dream map share failed", e);
      }
    }
    {
      if (visuals.emojis.length > 0) {
        try {
          await ingestDreamForMap({
            uid: user.uid,
            dreamId,
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
      shared_to_map: true,
      shared_to_feed: wantsShare,
    });

    return {
      status: "imported",
      dreamId,
      shared: wantsShare,
      analysis: analysis || undefined,
      shareCount,
    };
  } catch (error) {
    // Nothing was written: hand the cache back so the journal composer (and a
    // later retry) can still find the dream.
    restorePending(pending);
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
