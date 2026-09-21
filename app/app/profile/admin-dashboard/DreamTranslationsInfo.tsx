"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

/**
 * Admin view of a shared dream's translations: who paid for the first (AI)
 * translation per language, how many times the cached text was re-sold, and
 * the full serve log (shared_dreams/{id}/translationEvents).
 *
 * Text + stats live in shared_dreams/{id}/private/translations (admin-only
 * read); legacy entries may still sit on the public doc's `translations`
 * field until their first paid serve or scripts/migrate-translations-private.mjs.
 * Written by app/api/dreams/_lib/translationLedger.ts.
 */

export type TranslationEntry = {
  text?: string;
  model?: string | null;
  atMs?: number;
  byUid?: string | null;
  byName?: string | null;
  byEmail?: string | null;
  aiCalls?: number;
  cacheHits?: number;
  unlockCount?: number;
  lastServedAtMs?: number;
  lastServedByUid?: string | null;
  lastSource?: string | null;
};

type Event = {
  id: string;
  uid?: string;
  name?: string | null;
  email?: string | null;
  lang?: string;
  source?: string;
  model?: string | null;
  usedDailyFree?: boolean;
  paid?: boolean;
  atMs?: number;
};

function fmt(ms?: number) {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "";
  }
}

function who(e: { name?: string | null; email?: string | null; uid?: string | null; byUid?: string | null }) {
  const label = (e.email ?? "").trim() || (e.name ?? "").trim();
  const uid = e.uid ?? e.byUid ?? "";
  if (label && uid) return `${label} (${uid.slice(0, 6)}…)`;
  return label || uid || "—";
}

function normalize(v: unknown): TranslationEntry | null {
  if (!v) return null;
  if (typeof v === "string") return v.trim() ? { text: v.trim() } : null;
  if (typeof v === "object") return v as TranslationEntry;
  return null;
}

export default function DreamTranslationsInfo({
  sharedDreamId,
  translatedLangs,
  translationCount,
  legacyTranslations,
  mutedText,
}: {
  sharedDreamId: string;
  /** from the public doc when the row already is a shared_dreams row */
  translatedLangs?: string[];
  translationCount?: number;
  legacyTranslations?: Record<string, unknown> | null;
  mutedText: string;
}) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<Event[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showText, setShowText] = useState<string | null>(null);
  // private doc (text + stats) is only loaded when details are opened; the
  // summary line uses the public doc's translatedLangs / translationCount.
  const [priv, setPriv] = useState<Record<string, unknown> | null | undefined>(undefined);
  // public doc fetched lazily when the row came from users/*/dreams
  const [pub, setPub] = useState<{ langs: string[]; count?: number; legacy: Record<string, unknown> | null } | null>(
    null
  );

  const needsPublic = translatedLangs === undefined && legacyTranslations === undefined;
  useEffect(() => {
    if (!needsPublic || !sharedDreamId) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(firestore, "shared_dreams", sharedDreamId));
        if (cancelled) return;
        const data = snap.exists() ? (snap.data() as any) : null;
        setPub({
          langs: Array.isArray(data?.translatedLangs) ? data.translatedLangs : [],
          count: typeof data?.translationCount === "number" ? data.translationCount : undefined,
          legacy: data?.translations ?? null,
        });
      } catch {
        if (!cancelled) setPub({ langs: [], legacy: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsPublic, sharedDreamId]);

  const effLangs = needsPublic ? pub?.langs ?? [] : translatedLangs ?? [];
  const effCount = needsPublic ? pub?.count : translationCount;
  const effLegacy = needsPublic ? pub?.legacy : legacyTranslations;

  if (needsPublic && !pub) {
    return <div className={`mt-2 text-xs ${mutedText}`}>translations: …</div>;
  }

  // summary: private langs (once loaded) ∪ public translatedLangs ∪ legacy keys
  const summaryLangs = Array.from(
    new Set([
      ...effLangs,
      ...Object.keys(effLegacy ?? {}),
      ...Object.keys(priv ?? {}).filter((k) => k !== "updatedAtMs"),
    ])
  );

  const langs = Object.entries({ ...(effLegacy ?? {}), ...(priv ?? {}) })
    .filter(([k]) => k !== "updatedAtMs")
    .map(([lang, raw]) => [lang, normalize(raw)] as const)
    .filter((x): x is readonly [string, TranslationEntry] => !!x[1]);

  if (!summaryLangs.length) {
    return (
      <div className={`mt-2 text-xs ${mutedText}`}>
        translations: <b>none</b>
      </div>
    );
  }

  async function loadDetails() {
    if (loading) return;
    setLoading(true);
    setErr(null);
    try {
      if (priv === undefined) {
        const snap = await getDoc(doc(firestore, "shared_dreams", sharedDreamId, "private", "translations"));
        setPriv(snap.exists() ? (snap.data() as Record<string, unknown>) : null);
      }
      if (!events) {
        const snap = await getDocs(
          query(collection(firestore, "shared_dreams", sharedDreamId, "translationEvents"), orderBy("atMs", "desc"))
        );
        setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load translation details");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 text-xs">
      <div className={`${mutedText} flex flex-wrap gap-x-3 gap-y-1`}>
        <span>
          translations: <b>{summaryLangs.map((l) => l.toUpperCase()).join(", ")}</b>
          {typeof effCount === "number" ? ` · served ${effCount}×` : ""}
        </span>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            if (!open) void loadDetails();
          }}
          className="underline underline-offset-2 hover:opacity-80"
        >
          {open ? "hide details" : "details"}
        </button>
      </div>

      {open ? (
        <div className="mt-2 space-y-2">
          {loading && priv === undefined ? <div className={mutedText}>loading…</div> : null}
          {langs.map(([lang, t]) => {
            const hasStats = t.aiCalls != null || t.cacheHits != null || t.byUid;
            return (
              <div
                key={lang}
                className="rounded-xl border border-[var(--border)] bg-[rgba(127,127,127,0.06)] px-3 py-2"
              >
                <div className={`${mutedText} flex flex-wrap gap-x-3 gap-y-1`}>
                  <span>
                    <b>{lang.toUpperCase()}</b>
                  </span>
                  <span>
                    first translated by: <b>{t.byUid || t.byEmail || t.byName ? who({ name: t.byName, email: t.byEmail, byUid: t.byUid }) : "unknown (legacy entry)"}</b>
                  </span>
                  {t.atMs ? <span>{fmt(t.atMs)}</span> : null}
                  <span>
                    model: <span className="font-mono">{t.model ?? "?"}</span>
                  </span>
                  {hasStats ? (
                    <>
                      <span>
                        AI calls: <b>{t.aiCalls ?? 0}</b>
                      </span>
                      <span>
                        cache hits: <b>{t.cacheHits ?? 0}</b>
                      </span>
                      <span>
                        unlocked by: <b>{t.unlockCount ?? 0}</b> users
                      </span>
                      {t.lastServedAtMs ? (
                        <span>
                          last: {fmt(t.lastServedAtMs)} ({t.lastSource ?? "?"})
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span>(no stats — legacy entry on the public doc, moves to private on next paid serve)</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowText((cur) => (cur === lang ? null : lang))}
                    className="underline underline-offset-2 hover:opacity-80"
                  >
                    {showText === lang ? "hide text" : "show text"}
                  </button>
                </div>
                {showText === lang ? (
                  <div className={`mt-2 ${mutedText} whitespace-pre-wrap break-words`}>{t.text ?? ""}</div>
                ) : null}
              </div>
            );
          })}

          <div className={mutedText}>
            <div className="font-semibold">Serve log</div>
            {loading ? <div>loading…</div> : null}
            {err ? <div className="text-red-500">{err}</div> : null}
            {events && !events.length ? <div>no events (all serves predate the ledger)</div> : null}
            {events?.length ? (
              <table className="mt-1 w-full text-left">
                <thead>
                  <tr className="opacity-70">
                    <th className="pr-3 font-normal">when</th>
                    <th className="pr-3 font-normal">who</th>
                    <th className="pr-3 font-normal">lang</th>
                    <th className="pr-3 font-normal">source</th>
                    <th className="pr-3 font-normal">paid with</th>
                    <th className="pr-3 font-normal">model</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="border-t border-[var(--border)]">
                      <td className="pr-3 py-1 whitespace-nowrap">{fmt(e.atMs)}</td>
                      <td className="pr-3 py-1">{who(e)}</td>
                      <td className="pr-3 py-1">{(e.lang ?? "").toUpperCase()}</td>
                      <td className="pr-3 py-1">
                        <b>{e.source === "ai" ? "AI (OpenAI)" : e.source === "cache" ? "cache" : e.source ?? "?"}</b>
                      </td>
                      <td className="pr-3 py-1">{e.paid ? "Pro" : e.usedDailyFree ? "daily free" : "?"}</td>
                      <td className="pr-3 py-1 font-mono">{e.model ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
