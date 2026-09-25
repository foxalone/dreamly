import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { FieldPath } from "firebase-admin/firestore";
import type { DocumentReference, DocumentSnapshot, Transaction } from "firebase-admin/firestore";
import { requireAdmin } from "../../_lib/auth";
import { adminDb } from "../../_lib/firebaseAdmin";
import { getOneiroOpenAiApiKey, getMissingOneiroOpenAiKeyMessage } from "@/lib/openaiEnv";
import { getDreamEmojiResolver, pickDreamEmojisAi } from "@/lib/pickDreamEmojisAi";
import { DREAM_EMOJI_MAX, normalizeEmojiKey, type DreamEmojiEntry } from "@/lib/dreamEmojiResolve";

/**
 * POST /api/admin/dreams/emojis   (admin only, Bearer id token)
 *
 * Body: { mode: "preview" | "apply", target: Target, emojis?: string[] }
 *   Target = { kind: "user", uid, itemId, sourceType: "dream" | "story" }
 *          | { kind: "guest", guestDreamId }
 *
 * preview → runs the AI emoji picker on the item's text and returns the
 *           validated pick without writing anything.
 * apply   → replaces the item's emojis everywhere they live:
 *           - users/{uid}/{dreams|stories}/{id}.emojis (or guest_dreams/{id})
 *           - shared_dreams/{sharedId}.emojis when the item is shared
 *           - the linked guest_dreams snapshot (home Ask before sign-in)
 *           - per-emoji counters (users/{uid}/stats/emoji, users/{uid}/emoji_daily,
 *             city_emoji_stats, city_emoji_daily): old emojis -1, new ones +1,
 *             only where map_ingested says this item was counted.
 */
export const runtime = "nodejs";

type SourceType = "dream" | "story";
type Target =
  | { kind: "user"; uid: string; itemId: string; sourceType: SourceType }
  | { kind: "guest"; guestDreamId: string };

type EmojiObj = { native: string; id?: string; name?: string };

function s(v: unknown) {
  return String(v ?? "").trim();
}

function parseTarget(raw: any): Target | null {
  const kind = s(raw?.kind);
  if (kind === "guest") {
    const guestDreamId = s(raw?.guestDreamId);
    return guestDreamId ? { kind: "guest", guestDreamId } : null;
  }
  if (kind === "user") {
    const uid = s(raw?.uid);
    const itemId = s(raw?.itemId);
    const sourceType: SourceType = s(raw?.sourceType).toLowerCase() === "story" ? "story" : "dream";
    return uid && itemId ? { kind: "user", uid, itemId, sourceType } : null;
  }
  return null;
}

function nativesOf(list: unknown): string[] {
  return (Array.isArray(list) ? list : []).map((e: any) => s(e?.native)).filter(Boolean);
}

function toEmojiObjs(list: DreamEmojiEntry[]): EmojiObj[] {
  return list.map((e) => ({ native: e.native, id: e.id, name: e.name }));
}

/**
 * Re-point per-emoji counters from `oldNatives` to `newNatives` on a stats doc.
 *
 * The ingest routes write counters with `set({ ["emojis.🐍"]: increment }, {merge})`,
 * which the Admin SDK stores as a LITERAL top-level field named "emojis.🐍"
 * (set() does not split dotted keys); the map and the admin search read both
 * that shape and a nested `emojis: { "🐍": n }` map. So each emoji is looked
 * up in both places, decremented where it actually lives, and new emojis go
 * to the literal shape the ingests use. Writes go through FieldPath objects so
 * neither dots nor emoji characters are ever parsed as paths. Counts are
 * clamped at zero and zero fields are deleted.
 */
function adjustCounters(
  tx: Transaction,
  ref: DocumentReference,
  snap: DocumentSnapshot,
  prefix: "emojis" | "storyEmojis",
  oldNatives: string[],
  newNatives: string[]
) {
  if (!snap.exists) return;
  const data = snap.data() ?? {};
  const nested: Record<string, unknown> =
    data?.[prefix] && typeof data[prefix] === "object" && !Array.isArray(data[prefix]) ? data[prefix] : {};
  const literalPrefix = `${prefix}.`;

  type Slot = { path: FieldPath; count: number };
  // key → where this emoji is counted (literal field wins, then nested)
  const slots = new Map<string, Slot>();
  const norm = (k: string) => normalizeEmojiKey(k);
  const findSlot = (em: string): Slot | null => {
    const want = norm(em);
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith(literalPrefix) && norm(k.slice(literalPrefix.length)) === want) {
        return { path: new FieldPath(k), count: Number(v) || 0 };
      }
    }
    for (const [k, v] of Object.entries(nested)) {
      if (norm(k) === want) return { path: new FieldPath(prefix, k), count: Number(v) || 0 };
    }
    return null;
  };
  const slotFor = (em: string): Slot => {
    const id = norm(em);
    let slot = slots.get(id);
    if (!slot) {
      slot = findSlot(em) ?? { path: new FieldPath(`${prefix}.${em}`), count: 0 };
      slots.set(id, slot);
    }
    return slot;
  };

  const delta = new Map<Slot, number>();
  for (const em of oldNatives) {
    const sl = slotFor(em);
    delta.set(sl, (delta.get(sl) ?? 0) - 1);
  }
  for (const em of newNatives) {
    const sl = slotFor(em);
    delta.set(sl, (delta.get(sl) ?? 0) + 1);
  }

  const args: unknown[] = [];
  for (const [sl, d] of delta) {
    if (d === 0) continue;
    const next = Math.max(0, sl.count + d);
    args.push(sl.path, next > 0 ? next : admin.firestore.FieldValue.delete());
  }
  if (!args.length) return;
  args.push(new FieldPath("updatedAt"), admin.firestore.FieldValue.serverTimestamp());
  (tx.update as any)(ref, ...args);
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
  } catch (e: any) {
    const msg = e?.message === "FORBIDDEN" ? "Forbidden" : "Unauthorized";
    return NextResponse.json({ ok: false, error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode = s(body?.mode) === "apply" ? "apply" : "preview";
    const target = parseTarget(body?.target);
    if (!target) return NextResponse.json({ ok: false, error: "Bad target" }, { status: 400 });

    const db = adminDb();

    const itemRef =
      target.kind === "guest"
        ? db.collection("guest_dreams").doc(target.guestDreamId)
        : db
            .collection("users")
            .doc(target.uid)
            .collection(target.sourceType === "story" ? "stories" : "dreams")
            .doc(target.itemId);

    const itemSnap = await itemRef.get();
    if (!itemSnap.exists) return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
    const item = itemSnap.data() ?? {};
    const text = s(item.text);
    const current: EmojiObj[] = Array.isArray(item.emojis) ? item.emojis : [];

    // ---------- preview ----------
    if (mode === "preview") {
      if (!text) return NextResponse.json({ ok: false, error: "Item has no text" }, { status: 400 });
      const apiKey = getOneiroOpenAiApiKey();
      if (!apiKey) return NextResponse.json({ ok: false, error: getMissingOneiroOpenAiKeyMessage() }, { status: 500 });
      const pick = await pickDreamEmojisAi(apiKey, text);
      if (!pick.emojis.length) {
        return NextResponse.json({ ok: false, error: "Model returned no usable emojis", raw: pick.raw, model: pick.model }, { status: 502 });
      }
      return NextResponse.json({ ok: true, mode, model: pick.model, raw: pick.raw, current, emojis: toEmojiObjs(pick.emojis) });
    }

    // ---------- apply ----------
    const resolver = getDreamEmojiResolver();
    const next = resolver.resolveMany(Array.isArray(body?.emojis) ? body.emojis : [], DREAM_EMOJI_MAX);
    if (!next.length) return NextResponse.json({ ok: false, error: "No valid emojis to apply" }, { status: 400 });
    const nextObjs = toEmojiObjs(next);
    const nextNatives = nextObjs.map((e) => e.native);
    const oldNatives = nativesOf(current);

    // Everything below is one transaction: all reads first, then writes.
    const result = await db.runTransaction(async (tx) => {
      const touched: string[] = [];
      const nowMs = Date.now();
      const stamp = {
        emojisSource: "admin_ai",
        emojisUpdatedAtMs: nowMs,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (target.kind === "guest") {
        const guestSnap = await tx.get(itemRef);
        const guest = guestSnap.data() ?? {};
        const ingestRef = db.collection("map_ingested").doc(target.guestDreamId);
        const ingestSnap = await tx.get(ingestRef);
        const ingest = ingestSnap.exists ? ingestSnap.data() ?? {} : null;
        const cityId = s(ingest?.cityId || guest.cityId);
        const dateKey = s(ingest?.dateKey);
        const cityStatsRef = cityId ? db.collection("city_emoji_stats").doc(cityId) : null;
        const cityDailyRef = cityId && dateKey ? db.collection("city_emoji_daily").doc(`${cityId}_${dateKey}`) : null;
        const cityStatsSnap = cityStatsRef ? await tx.get(cityStatsRef) : null;
        const cityDailySnap = cityDailyRef ? await tx.get(cityDailyRef) : null;

        // The imported copy in the user's journal (if the guest signed in later).
        const importedUid = s(guest.importedUid);
        const importedDreamId = s(guest.importedDreamId);
        const userItemRef =
          guest.imported && importedUid && importedDreamId
            ? db.collection("users").doc(importedUid).collection("dreams").doc(importedDreamId)
            : null;
        const userItemSnap = userItemRef ? await tx.get(userItemRef) : null;
        const sharedRef = userItemRef ? db.collection("shared_dreams").doc(`${importedUid}_${importedDreamId}`) : null;
        const sharedSnap = sharedRef ? await tx.get(sharedRef) : null;

        tx.update(itemRef, { emojis: nextObjs, ...stamp });
        touched.push(itemRef.path);
        if (ingest && cityStatsRef && cityStatsSnap) {
          adjustCounters(tx, cityStatsRef, cityStatsSnap, "emojis", oldNatives, nextNatives);
          touched.push(cityStatsRef.path);
          if (cityDailyRef && cityDailySnap) {
            adjustCounters(tx, cityDailyRef, cityDailySnap, "emojis", oldNatives, nextNatives);
            touched.push(cityDailyRef.path);
          }
          tx.update(ingestRef, { emojisCount: nextNatives.length });
        }
        if (userItemRef && userItemSnap?.exists) {
          tx.update(userItemRef, { emojis: nextObjs, ...stamp });
          touched.push(userItemRef.path);
        }
        if (sharedRef && sharedSnap?.exists) {
          tx.update(sharedRef, { emojis: nextObjs, ...stamp });
          touched.push(sharedRef.path);
        }
        return { touched };
      }

      // ---- user item ----
      const { uid, itemId, sourceType } = target;
      const prefix: "emojis" | "storyEmojis" = sourceType === "story" ? "storyEmojis" : "emojis";
      const sharedId = sourceType === "story" ? `${uid}_story_${itemId}` : `${uid}_${itemId}`;
      const ingestId = sourceType === "story" ? `${uid}_story_${itemId}` : `${uid}_${itemId}`;

      const sharedRef = db.collection("shared_dreams").doc(sharedId);
      const ingestRef = db.collection("map_ingested").doc(ingestId);
      const userStatsRef = db.collection("users").doc(uid).collection("stats").doc("emoji");

      const [freshItemSnap, sharedSnap, ingestSnap, userStatsSnap] = await Promise.all([
        tx.get(itemRef),
        tx.get(sharedRef),
        tx.get(ingestRef),
        tx.get(userStatsRef),
      ]);
      const fresh = freshItemSnap.data() ?? {};
      const oldNativesFresh = nativesOf(fresh.emojis);
      const ingest = ingestSnap.exists ? ingestSnap.data() ?? {} : null;
      const dateKey = s(ingest?.dateKey);
      const userDailyRef = dateKey ? db.collection("users").doc(uid).collection("emoji_daily").doc(dateKey) : null;
      const userDailySnap = userDailyRef ? await tx.get(userDailyRef) : null;

      // Was the city counted by this ingest, or by the guest pin made before
      // sign-in (home Ask → skipCity import)? Newer ingest records carry
      // `cityCounted`; older ones are inferred from the linked guest snapshot.
      let guestDocRef: DocumentReference | null = null;
      let guestDocSnap: DocumentSnapshot | null = null;
      if (sourceType === "dream") {
        const q = db
          .collection("guest_dreams")
          .where("importedUid", "==", uid)
          .where("importedDreamId", "==", itemId)
          .limit(1);
        const gs = await tx.get(q);
        if (!gs.empty) {
          guestDocRef = gs.docs[0].ref;
          guestDocSnap = gs.docs[0];
        }
      }
      const cityCountedHere =
        !!ingest && (typeof ingest.cityCounted === "boolean" ? ingest.cityCounted : !guestDocSnap);

      let cityStatsRef: DocumentReference | null = null;
      let cityDailyRef: DocumentReference | null = null;
      let cityStatsSnap: DocumentSnapshot | null = null;
      let cityDailySnap: DocumentSnapshot | null = null;
      let guestIngestRef: DocumentReference | null = null;
      let cityPrefix: "emojis" | "storyEmojis" = prefix;
      let cityOld = oldNativesFresh;

      if (cityCountedHere && s(ingest?.cityId)) {
        const cityId = s(ingest?.cityId);
        cityStatsRef = db.collection("city_emoji_stats").doc(cityId);
        cityDailyRef = dateKey ? db.collection("city_emoji_daily").doc(`${cityId}_${dateKey}`) : null;
      } else if (guestDocRef && guestDocSnap) {
        // City counters were bumped by the guest pin with the guest doc's emojis.
        const g = guestDocSnap.data() ?? {};
        guestIngestRef = db.collection("map_ingested").doc(guestDocRef.id);
        const gIngestSnap = await tx.get(guestIngestRef);
        const gIngest = gIngestSnap.exists ? gIngestSnap.data() ?? {} : null;
        const cityId = s(gIngest?.cityId || g.cityId);
        const gDateKey = s(gIngest?.dateKey);
        if (gIngest && cityId) {
          cityStatsRef = db.collection("city_emoji_stats").doc(cityId);
          cityDailyRef = gDateKey ? db.collection("city_emoji_daily").doc(`${cityId}_${gDateKey}`) : null;
          cityPrefix = "emojis";
          cityOld = nativesOf(g.emojis);
        } else {
          guestIngestRef = null;
        }
      }
      if (cityStatsRef) cityStatsSnap = await tx.get(cityStatsRef);
      if (cityDailyRef) cityDailySnap = await tx.get(cityDailyRef);

      // ---- writes ----
      tx.update(itemRef, { emojis: nextObjs, ...stamp });
      touched.push(itemRef.path);

      if (sharedSnap.exists) {
        tx.update(sharedRef, { emojis: nextObjs, ...stamp });
        touched.push(sharedRef.path);
      }

      if (ingest) {
        if (userStatsSnap.exists) {
          adjustCounters(tx, userStatsRef, userStatsSnap, prefix, oldNativesFresh, nextNatives);
          touched.push(userStatsRef.path);
        }
        if (userDailyRef && userDailySnap?.exists) {
          adjustCounters(tx, userDailyRef, userDailySnap, prefix, oldNativesFresh, nextNatives);
          touched.push(userDailyRef.path);
        }
        tx.update(ingestRef, { emojisCount: nextNatives.length });
      }

      if (cityStatsRef && cityStatsSnap) {
        adjustCounters(tx, cityStatsRef, cityStatsSnap, cityPrefix, cityOld, nextNatives);
        touched.push(cityStatsRef.path);
      }
      if (cityDailyRef && cityDailySnap) {
        adjustCounters(tx, cityDailyRef, cityDailySnap, cityPrefix, cityOld, nextNatives);
        touched.push(cityDailyRef.path);
      }
      if (guestDocRef) {
        tx.update(guestDocRef, { emojis: nextObjs, ...stamp });
        touched.push(guestDocRef.path);
        if (guestIngestRef) tx.update(guestIngestRef, { emojisCount: nextNatives.length });
      }

      return { touched };
    });

    return NextResponse.json({ ok: true, mode, emojis: nextObjs, previous: current, touched: result.touched });
  } catch (e: any) {
    console.error("admin dreams/emojis error:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
