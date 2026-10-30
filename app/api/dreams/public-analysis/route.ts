import { NextResponse } from "next/server";

import { adminFirestore } from "@/lib/firebaseAdmin";
import { ensureSharedDreamAnalyses } from "@/lib/ensureSharedDreamAnalysis";

export const runtime = "nodejs";

/**
 * POST { ids } — attach each public dream's own reading (guest snapshot or
 * the owner's journal) onto shared_dreams.analysisText, then return it.
 * The feed shows two lines; nothing here accepts analysis text from the client.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const analyses = await ensureSharedDreamAnalyses(adminFirestore(), (body as { ids?: unknown })?.ids);
    return NextResponse.json({ ok: true, analyses });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Server error" },
      { status: 500 },
    );
  }
}
