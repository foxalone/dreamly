// lib/dreams/enrichSavedDream.ts
// Server-side "full experience" for a freshly saved diary item: root words,
// emojis, Lucide icon keys and the city pin. Runs for every save — the free
// first save included — after /api/dreams/save has answered, so it no longer
// depends on the subscription or on the browser tab staying open.
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

    const iconsEn = filterIconsWithGlyph(
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

/**
 * Root words (+ icons when missing) for a diary item that already has its
 * emojis and map pin — the homepage-Ask import, whose visuals come from the
 * reading. Same server rule as every save, for every user, subscription or
 * not. Idempotent: does nothing once roots exist, so it can never be used to
 * burn AI calls on the same dream twice.
 */
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
  const hasRoots =
    (Array.isArray(item.roots) && item.roots.length > 0) || (Array.isArray(item.rootsEn) && item.rootsEn.length > 0);
  if (hasRoots) return { ok: true as const, skipped: true };

  const apiKey = getOneiroOpenAiApiKey();
  if (!apiKey) return { ok: false as const, reason: "no_key" };
  const roots = await extractRootWords(apiKey, text).catch((e) => {
    console.warn("fillMissingRoots: root words failed", e);
    return null;
  });
  if (!roots) return { ok: false as const, reason: "ai_failed" };

  const counts = desiredCountsFromText(text);
  const rootsMajor = (roots.roots ?? []).slice(0, counts.roots);
  const rootsEnMajor = (roots.rootsEn ?? roots.roots ?? []).slice(0, counts.roots);
  const hasIcons = Array.isArray(item.iconsEn) && item.iconsEn.length > 0;
  const iconsEn = hasIcons
    ? null
    : filterIconsWithGlyph(
        pickDreamIconsEn(normalizeForIconsEn(rootsEnMajor.join(" ")), counts.icons),
        DREAM_ICONS_EN as any,
        counts.icons
      );

  await itemRef.set(
    {
      roots: rootsMajor,
      rootsEn: rootsEnMajor,
      rootsLang: roots.lang ?? null,
      rootsTop: [],
      rootsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(iconsEn && iconsEn.length ? { iconsEn } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return { ok: true as const, roots: rootsMajor.length };
}
