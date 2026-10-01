import { NextResponse } from "next/server";

import { getDreamEntry } from "@/lib/dream-dictionary";
import {
  SYMBOL_CLICK_SOURCES,
  symbolClickDayKeys,
  type SymbolClickSource,
} from "@/lib/symbolClicks";
import { requireAdmin } from "../_lib/auth";
import { adminDb } from "../_lib/firebaseAdmin";

export const runtime = "nodejs";

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** GET ?days=7|30|0 (0 = all time). Rows sorted by clicks in the period. */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const url = new URL(req.url);
    const days = Math.max(0, Math.min(90, Math.trunc(Number(url.searchParams.get("days") ?? 0)) || 0));
    const db = adminDb();

    const allSnap = await db.collection("dictionary_symbol_clicks").get();

    const periodCounts = new Map<string, number>();
    const daily: { day: string; total: number }[] = [];
    if (days > 0) {
      const keys = symbolClickDayKeys(new Date(), days);
      const refs = keys.map((k) => db.collection("dictionary_symbol_clicks_daily").doc(k));
      const snaps = await db.getAll(...refs);
      snaps.forEach((snap, i) => {
        const data = snap.exists ? snap.data() ?? {} : {};
        daily.push({ day: keys[i], total: num(data.total) });
        const slugs = (data.slugs ?? {}) as Record<string, unknown>;
        for (const [slug, value] of Object.entries(slugs)) {
          periodCounts.set(slug, (periodCounts.get(slug) ?? 0) + num(value));
        }
      });
    }

    const rows = allSnap.docs
      .map((doc) => {
        const data = doc.data();
        const slug = String(data.slug ?? doc.id);
        const entry = getDreamEntry(slug);
        const rawSources = (data.sources ?? {}) as Record<string, unknown>;
        const sources = Object.fromEntries(
          SYMBOL_CLICK_SOURCES.map((s) => [s, num(rawSources[s])]).filter(([, n]) => (n as number) > 0),
        ) as Partial<Record<SymbolClickSource, number>>;
        const rawLocales = (data.locales ?? {}) as Record<string, unknown>;
        const locales = Object.fromEntries(
          Object.entries(rawLocales).map(([k, v]) => [k, num(v)]).filter(([, n]) => (n as number) > 0),
        ) as Record<string, number>;
        const total = num(data.count);
        return {
          slug,
          title: entry?.title ?? slug,
          icon: entry?.icon ?? "❔",
          parentSlug: entry?.parentSlug ?? null,
          total,
          period: days > 0 ? periodCounts.get(slug) ?? 0 : total,
          sources,
          locales,
          lastAtMs: data.lastAt?.toMillis?.() ?? null,
        };
      })
      .filter((row) => row.period > 0)
      .sort((a, b) => b.period - a.period || b.total - a.total || a.title.localeCompare(b.title));

    return NextResponse.json({ ok: true, days, rows, daily });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load clicks";
    const status =
      message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
