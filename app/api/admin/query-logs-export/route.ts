import { requireAdmin } from "../_lib/auth";
import { adminDb } from "../_lib/firebaseAdmin";

export const runtime = "nodejs";

type CsvValue = string | number | boolean | null | undefined;

function toMs(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const timestamp = value as {
    toMillis?: () => number;
    seconds?: number;
  };
  if (typeof timestamp.toMillis === "function") {
    const ms = timestamp.toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof timestamp.seconds === "number") {
    return Math.round(timestamp.seconds * 1000);
  }
  return null;
}

function toIso(ms: number | null) {
  return ms === null ? "" : new Date(ms).toISOString();
}

function csvCell(value: CsvValue) {
  let text = value == null ? "" : String(value);

  // Prevent spreadsheet software from interpreting user queries as formulas.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;

  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const db = adminDb();
    const [dictionarySnap, quickSymbolSnap] = await Promise.all([
      db.collection("dictionary_search_queries").orderBy("count", "desc").get(),
      db.collection("quick_symbol_queries").orderBy("count", "desc").get(),
    ]);

    const header = [
      "source",
      "id",
      "query",
      "normalized",
      "count",
      "last_has_results",
      "last_result_count",
      "last_matched",
      "has_page",
      "last_top_slug",
      "last_slug",
      "last_cost",
      "last_at_iso",
      "last_at_ms",
      "updated_at_iso",
      "updated_at_ms",
    ];

    const rows: CsvValue[][] = [];

    for (const doc of dictionarySnap.docs) {
      const data = doc.data();
      const lastAtMs = toMs(data.lastAt);
      const updatedAtMs = toMs(data.updatedAt);
      rows.push([
        "dictionary_search",
        doc.id,
        String(data.query ?? ""),
        String(data.normalized ?? ""),
        Number(data.count ?? 0) || 0,
        Boolean(data.lastHasResults),
        Number(data.lastResultCount ?? 0) || 0,
        null,
        null,
        data.lastTopSlug ? String(data.lastTopSlug) : "",
        "",
        null,
        toIso(lastAtMs),
        lastAtMs,
        toIso(updatedAtMs),
        updatedAtMs,
      ]);
    }

    for (const doc of quickSymbolSnap.docs) {
      const data = doc.data();
      const lastAtMs = toMs(data.lastAt);
      const updatedAtMs = toMs(data.updatedAt);
      rows.push([
        "quick_symbol",
        doc.id,
        String(data.query ?? ""),
        String(data.normalized ?? ""),
        Number(data.count ?? 0) || 0,
        null,
        null,
        Boolean(data.lastMatched),
        Boolean(data.hasPage),
        "",
        data.lastSlug ? String(data.lastSlug) : "",
        Number(data.lastCost ?? 0) || 0,
        toIso(lastAtMs),
        lastAtMs,
        toIso(updatedAtMs),
        updatedAtMs,
      ]);
    }

    const csv = `\uFEFF${[header, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")}\r\n`;
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dreamly-query-logs-${date}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export queries";
    const status =
      message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
