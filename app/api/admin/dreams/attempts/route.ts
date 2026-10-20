import { NextResponse } from "next/server";
import { requireAdmin } from "../../_lib/auth";
import { adminDb } from "../../_lib/firebaseAdmin";

export async function GET(req: Request) {
  try { await requireAdmin(req); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  try {
    const snap = await adminDb().collection("analysis_attempts").orderBy("updatedAtMs", "desc").limit(150).get();
    return NextResponse.json({ rows: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Could not load attempts" }, { status: 500 }); }
}
