import { NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { requireAdmin } from "../../_lib/auth";
import { adminDb } from "../../_lib/firebaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Admin dream search across BOTH users/{uid}/dreams and users/{uid}/stories.
 *
 * GET /api/admin/dreams/search?q=🚢&limit=100&scan=6000
 *
 *  - If `q` contains emoji, it is an emoji search: a document matches when any of
 *    its `emojis[].native` equals one of the query emoji (variation selectors and
 *    skin tones are ignored). For emoji mode the response also lists the
 *    city_emoji_stats cities where that emoji is counted on the map, so the admin
 *    can compare "what the map shows" with "what documents exist".
 *  - Otherwise it is a case-insensitive substring search over title / text / id /
 *    uid / city / iconsEn / rootsEn.
 *
 * The Firestore SDK cannot query `emojis[].native` directly (array-contains needs
 * the whole object), so this scans the collection groups server-side in pages of
 * 500, newest-first is NOT guaranteed during the scan — results are sorted by
 * createdAtMs afterwards. `scan` caps the number of documents read per group.
 */

type Row = {
  id: string;
  userId: string;
  sourceType: "dream" | "story" | "guest";
  dreamId?: string;
  guestId?: string;
  imported?: boolean;
  importedUid?: string | null;
  importedDreamId?: string | null;
  analysis?: string;
  analysisModel?: string | null;
  analysisLens?: string | null;
  analysisAtMs?: number;
  storyId?: string;
  title?: string;
  text?: string;
  createdAtMs?: number;
  shared?: boolean;
  sharedAtMs?: number;
  deleted?: boolean;
  deletedAtMs?: number;
  emojis?: Array<{ id?: string; name?: string; native?: string }>;
  cityId?: string | null;
  city?: string | null;
  country?: string | null;
  admin1?: string | null;
  citySource?: string | null;
};

type MapCity = {
  cityId: string;
  city?: string;
  admin1?: string;
  country?: string;
  dreams: number;
  stories: number;
};

function s(v: unknown) {
  return String(v ?? "").trim();
}

/** Strip variation selectors and skin-tone modifiers so 🚢 and 🚢️ compare equal. */
function normEmoji(v: string) {
  return v.replace(/[︎️]/g, "").replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "");
}

/** Split a string into emoji graphemes (keeps ZWJ sequences together). */
function extractEmojis(q: string): string[] {
  const seg = (Intl as any).Segmenter
    ? new (Intl as any).Segmenter(undefined, { granularity: "grapheme" })
    : null;
  const parts: string[] = seg
    ? Array.from(seg.segment(q), (x: any) => String(x.segment))
    : Array.from(q);
  const out = new Set<string>();
  for (const p of parts) {
    if (/\p{Extended_Pictographic}/u.test(p) || /\p{Regional_Indicator}/u.test(p)) {
      const n = normEmoji(p);
      if (n) out.add(n);
    }
  }
  return Array.from(out);
}

function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toGuestRow(id: string, data: any): Row {
  const guestId = s(data?.guestId);
  return {
    id,
    userId: guestId ? `guest:${guestId}` : "guest",
    sourceType: "guest",
    guestId,
    title: undefined,
    text: typeof data?.text === "string" ? data.text : undefined,
    analysis: typeof data?.analysis === "string" ? data.analysis : undefined,
    analysisModel: "home_ask",
    analysisLens: data?.lens ?? null,
    analysisAtMs: num(data?.createdAtMs),
    createdAtMs: num(data?.createdAtMs),
    shared: false,
    deleted: !!data?.deleted,
    deletedAtMs: num(data?.deletedAtMs),
    emojis: Array.isArray(data?.emojis) ? data.emojis : [],
    cityId: data?.cityId ?? null,
    city: data?.city ?? null,
    country: data?.country ?? null,
    admin1: data?.admin1 ?? null,
    citySource: data?.citySource ?? "ip",
    imported: !!data?.imported,
    importedUid: data?.importedUid ?? null,
    importedDreamId: data?.importedDreamId ?? null,
  };
}

function toRow(path: string, id: string, data: any, sourceType: "dream" | "story"): Row {
  const parts = path.split("/");
  const i = parts.indexOf("users");
  const userId = i >= 0 && parts[i + 1] ? parts[i + 1] : "unknown";
  return {
    id,
    userId,
    sourceType,
    dreamId: sourceType === "dream" ? id : undefined,
    storyId: sourceType === "story" ? id : undefined,
    title: typeof data?.title === "string" ? data.title : undefined,
    text: typeof data?.text === "string" ? data.text : undefined,
    analysis: typeof data?.analysisText === "string" ? data.analysisText : undefined,
    analysisModel: data?.analysisModel ?? null,
    analysisLens: data?.analysisLens ?? null,
    analysisAtMs: num(data?.analysisAtMs),
    createdAtMs: num(data?.createdAtMs),
    shared: !!data?.shared,
    sharedAtMs: num(data?.sharedAtMs),
    deleted: !!data?.deleted,
    deletedAtMs: num(data?.deletedAtMs),
    emojis: Array.isArray(data?.emojis) ? data.emojis : [],
    cityId: data?.cityId ?? null,
    city: data?.city ?? null,
    country: data?.country ?? null,
    admin1: data?.admin1 ?? null,
    citySource: data?.citySource ?? null,
  };
}

function emojiCountsFromDoc(raw: any, prefix: "emojis" | "storyEmojis"): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return out;
  const dotted = `${prefix}.`;
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith(dotted)) continue;
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) out[normEmoji(key.slice(dotted.length))] = n;
  }
  const nested = raw[prefix];
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    for (const [em, value] of Object.entries(nested)) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) {
        const k = normEmoji(em);
        out[k] = (out[k] ?? 0) + n;
      }
    }
  }
  return out;
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const url = new URL(req.url);
    const q = s(url.searchParams.get("q"));
    const limit = Math.min(300, Math.max(1, Number(url.searchParams.get("limit")) || 100));
    const scanCap = Math.min(20000, Math.max(500, Number(url.searchParams.get("scan")) || 6000));

    if (!q) {
      return NextResponse.json({ ok: false, error: "Missing q" }, { status: 400 });
    }

    const emojiTokens = extractEmojis(q);
    const mode: "emoji" | "text" = emojiTokens.length ? "emoji" : "text";
    const emojiSet = new Set(emojiTokens);
    const needle = q.toLowerCase();

    const matches = (data: any, id: string, userId: string): boolean => {
      if (mode === "emoji") {
        const list = Array.isArray(data?.emojis) ? data.emojis : [];
        return list.some((e: any) => emojiSet.has(normEmoji(s(e?.native))));
      }
      const hay = [
        id,
        userId,
        data?.title,
        data?.text,
        data?.analysisText,
        data?.analysis,
        data?.cityId,
        data?.city,
        data?.country,
        ...(Array.isArray(data?.iconsEn) ? data.iconsEn : []),
        ...(Array.isArray(data?.rootsEn) ? data.rootsEn : []),
      ]
        .map((x) => s(x).toLowerCase())
        .filter(Boolean)
        .join("\n");
      return hay.includes(needle);
    };

    const db = adminDb();
    const rows: Row[] = [];
    const scanned = { dreams: 0, stories: 0, guests: 0 };
    let truncated = false;

    for (const group of ["dreams", "stories"] as const) {
      const sourceType = group === "dreams" ? "dream" : "story";
      let last: FirebaseFirestore.QueryDocumentSnapshot | null = null;
      let read = 0;

      while (read < scanCap && rows.length < limit) {
        let query = db
          .collectionGroup(group)
          .orderBy(FieldPath.documentId())
          .limit(500);
        if (last) query = query.startAfter(last);

        const snap = await query.get();
        if (snap.empty) break;

        for (const docSnap of snap.docs) {
          read += 1;
          const path = docSnap.ref.path;
          // only users/{uid}/{group}/{id}; ignore other nested "dreams" collections if any
          if (!path.startsWith("users/")) continue;
          const data = docSnap.data();
          const row = toRow(path, docSnap.id, data, sourceType);
          if (matches(data, docSnap.id, row.userId)) {
            rows.push(row);
            if (rows.length >= limit) break;
          }
        }

        last = snap.docs[snap.docs.length - 1];
        if (snap.size < 500) break;
      }

      scanned[group] = read;
      if (read >= scanCap || rows.length >= limit) truncated = true;
    }

    // guest pins (homepage Ask without sign-in) — flat collection guest_dreams
    if (rows.length < limit) {
      let last: FirebaseFirestore.QueryDocumentSnapshot | null = null;
      let read = 0;
      while (read < scanCap && rows.length < limit) {
        let query = db.collection("guest_dreams").orderBy(FieldPath.documentId()).limit(500);
        if (last) query = query.startAfter(last);
        const snap = await query.get();
        if (snap.empty) break;
        for (const docSnap of snap.docs) {
          read += 1;
          const data = docSnap.data();
          const row = toGuestRow(docSnap.id, data);
          if (matches(data, docSnap.id, row.userId)) {
            rows.push(row);
            if (rows.length >= limit) break;
          }
        }
        last = snap.docs[snap.docs.length - 1];
        if (snap.size < 500) break;
      }
      scanned.guests = read;
      if (read >= scanCap || rows.length >= limit) truncated = true;
    }

    rows.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));

    // Where does this emoji live on the map?
    let mapCities: MapCity[] = [];
    if (mode === "emoji") {
      const statsSnap = await db.collection("city_emoji_stats").limit(5000).get();
      for (const docSnap of statsSnap.docs) {
        const raw = docSnap.data() as any;
        const dreamMap = emojiCountsFromDoc(raw, "emojis");
        const storyMap = emojiCountsFromDoc(raw, "storyEmojis");
        let dreams = 0;
        let stories = 0;
        for (const em of emojiTokens) {
          dreams += dreamMap[em] ?? 0;
          stories += storyMap[em] ?? 0;
        }
        if (dreams + stories === 0) continue;
        mapCities.push({
          cityId: s(raw.cityId) || docSnap.id,
          city: raw.city ?? undefined,
          admin1: raw.admin1 ?? undefined,
          country: raw.country ?? undefined,
          dreams,
          stories,
        });
      }
      mapCities.sort((a, b) => b.dreams + b.stories - (a.dreams + a.stories));
    }

    return NextResponse.json({
      ok: true,
      mode,
      tokens: emojiTokens,
      matches: rows,
      scanned,
      truncated,
      mapCities,
    });
  } catch (e: any) {
    const msg = e?.message ?? "Search failed";
    const status = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
