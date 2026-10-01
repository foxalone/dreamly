import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { getDreamEntry } from "@/lib/dream-dictionary";
import { getDreamGuide } from "@/lib/dream-guides";
import {
  classifySymbolClickSource,
  splitLocalePath,
  symbolClickDayKey,
} from "@/lib/symbolClicks";
import { adminDb } from "../../admin/_lib/firebaseAdmin";

export const runtime = "nodejs";

type Body = {
  slug?: string;
  fromPath?: string;
  inSearch?: boolean;
};

/**
 * Logs one click on a dictionary symbol icon (a link to /dreams/<slug> that shows the symbol's emoji).
 * dictionary_symbol_clicks/{slug}: all-time totals + per-source/per-locale maps.
 * dictionary_symbol_clicks_daily/{YYYY-MM-DD}: per-slug counts for the admin period filter.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const slug = String(body.slug ?? "").trim().toLowerCase();
    const found = slug && slug.length <= 120 ? getDreamEntry(slug) : undefined;
    // DREAM_DICTIONARY is a plain object: "constructor" etc. would resolve to prototype members.
    const entry = found && found.slug === slug ? found : undefined;
    if (!entry) {
      return NextResponse.json({ error: "Unknown symbol" }, { status: 400 });
    }

    const fromPath = String(body.fromPath ?? "/").slice(0, 200);
    const { locale } = splitLocalePath(fromPath);
    const source = classifySymbolClickSource(fromPath, {
      inSearch: Boolean(body.inSearch),
      isSymbol: (s) => getDreamEntry(s)?.slug === s,
      isGuide: (s) => getDreamGuide(s)?.slug === s,
    });
    const dayKey = symbolClickDayKey(new Date());
    const db = adminDb();
    const now = FieldValue.serverTimestamp();
    const inc = FieldValue.increment(1);

    const batch = db.batch();
    batch.set(
      db.collection("dictionary_symbol_clicks").doc(entry.slug),
      {
        slug: entry.slug,
        count: inc,
        sources: { [source]: inc },
        locales: { [locale]: inc },
        lastAt: now,
        lastSource: source,
      },
      { merge: true },
    );
    batch.set(
      db.collection("dictionary_symbol_clicks_daily").doc(dayKey),
      {
        day: dayKey,
        total: inc,
        slugs: { [entry.slug]: inc },
        updatedAt: now,
      },
      { merge: true },
    );
    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("dictionary_symbol_clicks log failed:", error);
    return NextResponse.json({ error: "Failed to log click" }, { status: 500 });
  }
}
