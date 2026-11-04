// lib/dreams/enrichSavedDream.ts
// Server-side "full experience" for a freshly saved diary item: root words,
// emojis, Lucide icon keys and the city pin. Runs for every save — the free
// first save included — after /api/dreams/save has answered, so it no longer
// depends on the subscription or on the browser tab staying open.
import { needsImportedRootRepair, needsImportedVisualRepair } from "@/lib/importedDreamRoots";
import admin from "firebase-admin";
import emojiData from "@emoji-mart/data";
import { adminDb as adminFirestore } from "@/app/api/admin/_lib/firebaseAdmin";
import { getOneiroOpenAiApiKey } from "@/lib/openaiEnv";
import { pickDreamEmojisAi } from "@/lib/pickDreamEmojisAi";
import { hasEnoughDreamEmojis } from "@/lib/dreamEmojiResolve";
import { pickDreamIconsEn, DREAM_ICONS_EN } from "@/lib/dream-icons/dreamIcons.en";
import {
  desiredCountsFromText,
  filterIconsWithGlyph,
  normalizeForIconsEn,
  pickEmojisByKeywords,
} from "@/lib/dreamVisuals";
import { extractRootWords, type RootWordsResult } from "@/lib/dreams/rootWords";
import type { IpCity } from "@/lib/geo/resolveIpCity";
import { cityWriteFields, ingestDreamServer, type SourceType } from "@/lib/map/ingestDreamServer";

type DreamEmoji = { native: string; id?: string; name?: string };

function s(v: unknown) {
  return String(v ?? "").trim();
}

/** A share may be published before its background visuals finish. Fill only
 * missing public visuals, preserving any later edits to the shared dream. */
async function fillSharedVisuals(params: {
  uid: string;
  itemId: string;
  sourceType: SourceType;
  emojis: DreamEmoji[];
  iconsEn: string[];
}) {
  const { uid, itemId, sourceType, emojis, iconsEn } = params;
  if (!emojis.length && !iconsEn.length) return;
  const sharedId = sourceType === "story" ? `${uid}_story_${itemId}` : `${uid}_${itemId}`;
  const db = adminFirestore();
  const ref = db.collection("shared_dreams").doc(sharedId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const shared = snap.data() ?? {};
    if (shared.ownerUid !== uid || shared.deleted === true) return;
    const patch: { emojis?: DreamEmoji[]; iconsEn?: string[] } = {};
    if (emojis.length && !(Array.isArray(shared.emojis) && shared.emojis.some((e: DreamEmoji) => s(e?.native)))) {
      patch.emojis = emojis;
    }
    if (iconsEn.length && !(Array.isArray(shared.iconsEn) && shared.iconsEn.length)) {
      patch.iconsEn = iconsEn;
    }
    if (Object.keys(patch).length) tx.update(ref, patch);
  });
}

export async function enrichSavedDream(params: {
  uid: string;
  itemId: string;
  sourceType: SourceType;
  ipCity: (IpCity & { ip?: string }) | null;
  baseUrl: string | null;
}) {
  const { uid, itemId, sourceType } = params;
  const db = adminFirestore();
  const itemRef = db
    .collection("users")
    .doc(uid)
    .collection(sourceType === "story" ? "stories" : "dreams")
    .doc(itemId);

  const snap = await itemRef.get();
  if (!snap.exists) return { ok: false as const, reason: "not_found" };
  const item = snap.data() ?? {};
  const text = s(item.text);
  if (!text || item.deleted === true) return { ok: false as const, reason: "no_text" };

  const hasEmojis = Array.isArray(item.emojis) && item.emojis.some((e: any) => s(e?.native));
  let emojis: DreamEmoji[] = hasEmojis ? item.emojis : [];
  let iconsEn: string[] = Array.isArray(item.iconsEn) ? item.iconsEn : [];

  if (!hasEmojis) {
    const apiKey = getOneiroOpenAiApiKey();
    const counts = desiredCountsFromText(text);

    let roots: RootWordsResult | null = null;
    let aiEmojis: DreamEmoji[] = [];
    if (apiKey) {
      const [rootsRes, pickRes] = await Promise.all([
        extractRootWords(apiKey, text).catch((e) => {
          console.warn("enrichSavedDream: root words failed", e);
          return null;
        }),
        pickDreamEmojisAi(apiKey, text).catch(() => null),
      ]);
      roots = rootsRes;
      if (pickRes && hasEnoughDreamEmojis(pickRes.emojis)) {
        aiEmojis = pickRes.emojis.map((e) => ({ native: e.native, id: e.id, name: e.name }));
      }
    } else {
      console.warn("enrichSavedDream: OpenAI key missing");
    }

    const rootsMajor = (roots?.roots ?? []).slice(0, counts.roots);
    const rootsEnMajor = (roots?.rootsEn ?? roots?.roots ?? []).slice(0, counts.roots);

    if (aiEmojis.length) {
      emojis = aiEmojis.slice(0, Math.max(counts.emojis, 2));
    } else {
      // Same idea as the journal's per-root emoji-mart lookup, done on the server.
      const words = rootsEnMajor.length ? rootsEnMajor : normalizeForIconsEn(text).split(" ");
      emojis = pickEmojisByKeywords(words, emojiData as any, Math.max(counts.emojis, 2));
    }

    iconsEn = filterIconsWithGlyph(
      pickDreamIconsEn(normalizeForIconsEn(rootsEnMajor.join(" ")), counts.icons),
      DREAM_ICONS_EN as any,
      counts.icons
    );

    await itemRef.set(
      {
        ...(rootsMajor.length
          ? {
              roots: rootsMajor,
              rootsEn: rootsEnMajor,
              rootsLang: roots?.lang ?? null,
              rootsTop: [],
              rootsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }
          : {}),
        iconsEn,
        emojis,
        emojisSource: aiEmojis.length ? "server_ai" : "server_keywords",
        enrichedAtMs: Date.now(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  await fillSharedVisuals({ uid, itemId, sourceType, emojis, iconsEn }).catch((e) => {
    console.warn("enrichSavedDream: shared visuals sync failed", e);
  });
  if (emojis.some((e) => s(e?.native))) {
    const res = await ingestDreamServer({
      uid,
      itemId,
      sourceType,
      ipCity: params.ipCity,
      baseUrl: params.baseUrl,
      guestId: null,
    });
    return { ok: true as const, emojis: emojis.length, cityId: res.cityId ?? null };
  }

  // No emoji at all (model down and no keyword hit): still pin the city on the
  // item so the journal and the admin show where it was dreamt. No counters and
  // no map_ingested marker, so a later emoji fix can still ingest it fully.
  if (params.ipCity?.cityId) {
    await itemRef.set(
      cityWriteFields({
        cityId: params.ipCity.cityId,
        city: params.ipCity.city,
        country: params.ipCity.country,
        admin1: params.ipCity.admin1,
        source: "ip",
        lat: params.ipCity.lat,
        lng: params.ipCity.lng,
      }),
      { merge: true }
    );
  }
  return { ok: true as const, emojis: 0, cityId: params.ipCity?.cityId ?? null };
}

/** Repair imported symbols and missing visuals independently; preserve completed work. */
export async function fillMissingRoots(params: { uid: string; itemId: string; sourceType: SourceType }) {
  const { uid, itemId, sourceType } = params;
  const itemRef = adminFirestore()
    .collection("users")
    .doc(uid)
    .collection(sourceType === "story" ? "stories" : "dreams")
    .doc(itemId);
  const snap = await itemRef.get();
  if (!snap.exists) return { ok: false as const, reason: "not_found" };
  const item = snap.data() ?? {};
  const text = s(item.text);
  if (!text || item.deleted === true) return { ok: false as const, reason: "no_text" };
  if (!needsImportedVisualRepair(item)) {
    await fillSharedVisuals({
      uid, itemId, sourceType,
      emojis: Array.isArray(item.emojis) ? item.emojis.filter((e: DreamEmoji) => s(e?.native)) : [],
      iconsEn: Array.isArray(item.iconsEn) ? item.iconsEn : [],
    }).catch((e) => console.warn("fillMissingRoots: shared visuals sync failed", e));
    return { ok: true as const, skipped: true };
  }

  const apiKey = getOneiroOpenAiApiKey();
  const counts = desiredCountsFromText(text);
  let rootsMajor: string[] = Array.isArray(item.roots) ? item.roots : [];
  let rootsEnMajor: string[] = Array.isArray(item.rootsEn) ? item.rootsEn : [];
  let rootsLang = item.rootsLang ?? null;
  // Already repaired roots (such as forest/darkness) need no further model call.
  if (needsImportedRootRepair(item) || !rootsEnMajor.length) {
    if (!apiKey) return { ok: false as const, reason: "no_key" };
    const roots = await extractRootWords(apiKey, text).catch((e) => {
      console.warn("fillMissingRoots: root words failed", e);
      return null;
    });
    if (!roots) return { ok: false as const, reason: "ai_failed" };
    rootsMajor = roots.roots.slice(0, counts.roots);
    rootsEnMajor = roots.rootsEn.slice(0, counts.roots);
    rootsLang = roots.lang;
  }

  const existingIcons = filterIconsWithGlyph(
    Array.isArray(item.iconsEn) ? item.iconsEn : [], DREAM_ICONS_EN, counts.icons
  );
  const iconsEn = existingIcons.length ? existingIcons : filterIconsWithGlyph(
    pickDreamIconsEn(normalizeForIconsEn(rootsEnMajor.join(" ")), counts.icons),
    DREAM_ICONS_EN, counts.icons
  );
  let emojis: DreamEmoji[] = Array.isArray(item.emojis) ? item.emojis.filter((e: DreamEmoji) => s(e?.native)) : [];
  if (!emojis.length) {
    const pick = apiKey ? await pickDreamEmojisAi(apiKey, text).catch(() => null) : null;
    emojis = pick && hasEnoughDreamEmojis(pick.emojis)
      ? pick.emojis.map((e) => ({ native: e.native, id: e.id, name: e.name })).slice(0, Math.max(counts.emojis, 2))
      : pickEmojisByKeywords(rootsEnMajor, emojiData as any, Math.max(counts.emojis, 2));
  }

  await itemRef.set(
    {
      roots: rootsMajor,
      rootsVersion: 1,
      rootsEn: rootsEnMajor,
      rootsLang,
      rootsTop: [],
      rootsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      iconsEn,
      emojis,
      // Leave failed visual generation eligible for retry on the next visit.
      ...(iconsEn.length || emojis.length ? { visualsVersion: 1 } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  await fillSharedVisuals({ uid, itemId, sourceType, emojis, iconsEn }).catch((e) => {
    console.warn("fillMissingRoots: shared visuals sync failed", e);
  });
  return { ok: true as const, roots: rootsMajor.length };
}
