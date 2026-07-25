import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { adminDb } from "../../admin/_lib/firebaseAdmin";

export const runtime = "nodejs";

type Body = {
  query?: string;
  resultCount?: number;
  topSlug?: string | null;
};

function normalizeSearchQuery(value: string) {
  return value.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
}

function queryDocId(normalized: string) {
  return createHash("sha256").update(normalized).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const query = String(body.query ?? "").trim();
    const normalized = normalizeSearchQuery(query);

    if (normalized.length < 2 || query.length > 120) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const resultCount = Math.min(
      8,
      Math.max(0, Math.trunc(Number(body.resultCount) || 0)),
    );
    const topSlug = String(body.topSlug ?? "").trim().slice(0, 160) || null;
    const ref = adminDb()
      .collection("dictionary_search_queries")
      .doc(queryDocId(normalized));

    await ref.set(
      {
        query,
        normalized,
        count: FieldValue.increment(1),
        lastAt: FieldValue.serverTimestamp(),
        lastHasResults: resultCount > 0,
        lastResultCount: resultCount,
        lastTopSlug: topSlug,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("dictionary_search_queries log failed:", error);
    return NextResponse.json({ error: "Failed to log query" }, { status: 500 });
  }
}
