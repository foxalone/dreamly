import { adminDb } from "../../_lib/firebaseAdmin";
import { requireAdmin } from "../../_lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Admin CSV export of the Dreams tab for the last N days.
 *
 * GET /api/admin/dreams/export?days=7
 *
 * Reads users/{uid}/dreams (collection group) and guest_dreams where
 * createdAtMs >= now - days, newest first, deleted rows included (flagged in
 * the `deleted` column). Returns text/csv with a UTF-8 BOM so Excel opens
 * emoji and non-Latin text correctly.
 */

const PAGE = 500;
const HARD_CAP = 20000; // per source, safety net

type Rec = Record<string, unknown>;

const COLUMNS = [
  "source",
  "createdAt",
  "dateKey",
  "userId",
  "id",
  "title",
  "text",
  "emojis",
  "city",
  "admin1",
  "country",
  "cityId",
  "citySource",
  "shared",
  "deleted",
  "lens",
  "model",
  "analysis",
  "imported",
  "importedUid",
] as const;

function s(v: unknown) {
  return v == null ? "" : String(v);
}

function iso(ms: unknown) {
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 ? new Date(n).toISOString() : "";
}

function emojiList(v: unknown) {
  return Array.isArray(v) ? v.map((e: any) => s(e?.native)).filter(Boolean).join(" ") : "";
}

function cell(v: unknown) {
  const t = s(v);
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

async function collect(
  base: FirebaseFirestore.Query,
  since: number,
  map: (d: FirebaseFirestore.QueryDocumentSnapshot) => Rec | null,
) {
  const out: Rec[] = [];
  let last: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  while (out.length < HARD_CAP) {
    let q = base.where("createdAtMs", ">=", since).orderBy("createdAtMs", "desc").limit(PAGE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    for (const d of snap.docs) {
      const r = map(d);
      if (r) out.push(r);
    }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
  }
  return out;
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const url = new URL(req.url);
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 7));
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const db = adminDb();

    const [dreams, guests] = await Promise.all([
      collect(db.collectionGroup("dreams"), since, (d) => {
        const path = d.ref.path;
        if (!path.startsWith("users/")) return null;
        const x = d.data() as any;
        return {
          source: "user",
          createdAtMs: x.createdAtMs,
          createdAt: iso(x.createdAtMs),
          dateKey: x.dateKey,
          userId: path.split("/")[1],
          id: d.id,
          title: x.title,
          text: x.text,
          emojis: emojiList(x.emojis),
          city: x.city,
          admin1: x.admin1,
          country: x.country,
          cityId: x.cityId,
          citySource: x.citySource,
          shared: x.shared ? "yes" : "no",
          deleted: x.deleted ? "yes" : "no",
          lens: x.analysisLens,
          model: x.analysisModel,
          analysis: x.analysisText,
          imported: "",
          importedUid: "",
        };
      }),
      collect(db.collection("guest_dreams"), since, (d) => {
        const x = d.data() as any;
        const guestId = s(x.guestId).trim();
        return {
          source: "guest",
          createdAtMs: x.createdAtMs,
          createdAt: iso(x.createdAtMs),
          dateKey: x.dateKey,
          userId: guestId ? `guest:${guestId}` : "guest",
          id: d.id,
          title: "",
          text: x.text,
          emojis: emojiList(x.emojis),
          city: x.city,
          admin1: x.admin1,
          country: x.country,
          cityId: x.cityId,
          citySource: x.citySource ?? "ip",
          shared: "no",
          deleted: x.deleted ? "yes" : "no",
          lens: x.lens,
          model: "home_ask",
          analysis: x.analysis,
          imported: x.imported ? "yes" : "no",
          importedUid: x.importedUid,
        };
      }),
    ]);

    const rows = [...dreams, ...guests].sort(
      (a, b) => (Number(b.createdAtMs) || 0) - (Number(a.createdAtMs) || 0),
    );

    const lines = [COLUMNS.join(",")];
    for (const r of rows) lines.push(COLUMNS.map((c) => cell(r[c])).join(","));
    const csv = "﻿" + lines.join("\r\n") + "\r\n";

    const today = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dreams-last-${days}d-${today}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    const msg = e?.message ?? "Export failed";
    const status = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return Response.json({ ok: false, error: msg }, { status });
  }
}
