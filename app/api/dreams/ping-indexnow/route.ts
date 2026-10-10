import { NextResponse } from "next/server";

import { adminFirestore } from "@/lib/firebaseAdmin";
import { dreamPageIndexNowPaths, notifyIndexNow } from "@/lib/indexnow";

export const runtime = "nodejs";

/**
 * POST { dreamId } — IndexNow ping (Bing/Yandex/…) for a dream's public page,
 * called fire-and-forget from the client after a signed-in user shares a dream
 * (the share itself is a client-side Firestore write, so it can't ping).
 *
 * Only pings pages that actually exist publicly: the dream must be in
 * shared_dreams, not deleted and with a non-empty text — so this can't be used
 * to spam IndexNow with made-up URLs. Google ignores IndexNow entirely; it
 * discovers these pages through sitemap.xml.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const dreamId = String(body?.dreamId ?? "").trim();
    const paths = dreamPageIndexNowPaths(dreamId);
    if (paths.length === 0) {
      return NextResponse.json({ ok: false, error: "Bad dreamId" }, { status: 400 });
    }

    const snap = await adminFirestore().collection("shared_dreams").doc(dreamId).get();
    const data = snap.exists ? (snap.data() as any) : null;
    if (!data || data.deleted === true || !String(data?.text ?? "").trim()) {
      return NextResponse.json({ ok: false, code: "NOT_PUBLIC" }, { status: 404 });
    }

    const result = await notifyIndexNow(paths, { reason: "dream-share" });
    return NextResponse.json({ ok: result.ok, submitted: result.submitted });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
