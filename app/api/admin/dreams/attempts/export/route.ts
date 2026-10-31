import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { analysisAttemptsCsv } from "@/lib/analysisAttemptsCsv";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try { await requireAdmin(req); }
  catch { return Response.json({ error: "Forbidden" }, { status: 403 }); }

  try {
    const snap = await adminDb().collection("analysis_attempts").orderBy("updatedAtMs", "desc").limit(100).get();
    const rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Parameters<typeof analysisAttemptsCsv>[0];
    const date = new Date().toISOString().slice(0, 10);
    return new Response(analysisAttemptsCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="analysis-attempts-latest-100-${date}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return Response.json({ error: "Could not export attempts" }, { status: 500 });
  }
}
