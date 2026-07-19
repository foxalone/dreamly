import { NextResponse } from "next/server";
import { requireAdmin } from "../_lib/auth";
import { adminDb } from "../_lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const url = new URL(req.url);
    const limitN = Math.min(
      200,
      Math.max(1, Number(url.searchParams.get("limit") ?? 100) || 100)
    );

    const db = adminDb();
    const snap = await db
      .collection("quick_symbol_queries")
      .orderBy("count", "desc")
      .limit(limitN)
      .get();

    const rows = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        query: String(data?.query ?? ""),
        normalized: String(data?.normalized ?? ""),
        count: Number(data?.count ?? 0) || 0,
        lastMatched: !!data?.lastMatched,
        lastSlug: data?.lastSlug ? String(data.lastSlug) : null,
        hasPage: !!data?.hasPage,
        lastCost: Number(data?.lastCost ?? 0) || 0,
        lastAtMs: data?.lastAt?.toMillis?.() ?? null,
      };
    });

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    const msg = e?.message ?? "Failed to load queries";
    const code =
      msg === "FORBIDDEN" ? 403 : msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
