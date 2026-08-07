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
      Math.max(1, Number(url.searchParams.get("limit") ?? 100) || 100),
    );
    const snap = await adminDb()
      .collection("dictionary_search_queries")
      .orderBy("lastAt", "desc")
      .limit(limitN)
      .get();

    const rows = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        query: String(data.query ?? ""),
        normalized: String(data.normalized ?? ""),
        count: Number(data.count ?? 0) || 0,
        lastHasResults: Boolean(data.lastHasResults),
        lastResultCount: Number(data.lastResultCount ?? 0) || 0,
        lastTopSlug: data.lastTopSlug ? String(data.lastTopSlug) : null,
        lastAtMs: data.lastAt?.toMillis?.() ?? null,
      };
    });

    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load queries";
    const status =
      message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
