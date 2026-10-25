import { NextResponse } from "next/server";
import { requireAdmin } from "../_lib/auth";
import { adminDb } from "../_lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const snapshot = await adminDb().collection("site_metrics").doc("moon_clicks").get();
    const data = snapshot.data();
    return NextResponse.json({ total: data?.total ?? 0 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "COUNT_FAILED";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
