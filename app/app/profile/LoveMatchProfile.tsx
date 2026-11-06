"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { User } from "firebase/auth";
import { X } from "lucide-react";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n/messages";
import { loveCompatibilityCopy, loveMatchAiCopy, loveMatchProfileCopy, type RelationshipStatus } from "@/lib/i18n/love-compatibility";
import { isRelationshipStatus, type AiLoveMatch } from "@/lib/loveMatchAi";
import { forgetSavedLoveMatch, loveMatchInitial } from "@/lib/loveMatchSaved";
import styles from "./LoveMatchProfile.module.css";

type SavedPair = { id: string; you: string; them: string; createdAt: number; match: AiLoveMatch; status?: RelationshipStatus };

export default function LoveMatchProfile({ user }: { user: User }) {
  const locale = useLocale();
  const nav = useMessages().nav.loveCompatibility;
  const copy = loveMatchProfileCopy[locale];
  const reading = { ...loveCompatibilityCopy[locale], ...loveMatchAiCopy[locale] };
  const [pairs, setPairs] = useState<SavedPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<SavedPair | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedPair | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    void (async () => {
      const token = await user.getIdToken();
      const response = await fetch("/api/love-compatibility/saved", {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal,
      });
      if (!response.ok) throw new Error("Love matches unavailable");
      const result = await response.json() as { matches?: SavedPair[] };
      if (alive) {
        setPairs(Array.isArray(result.matches) ? result.matches : []);
        setError(false);
      }
    })().catch(() => { if (alive) setError(true); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; controller.abort(); };
  }, [user, retry]);

  useEffect(() => {
    const refresh = () => setRetry(value => value + 1);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("dreamly:love-saved", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("dreamly:love-saved", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    if (!selected && !pendingDelete) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || deleteBusy) return;
      if (pendingDelete) setPendingDelete(null);
      else setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, pendingDelete, deleteBusy]);

  async function removePair(pair: SavedPair) {
    if (deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(false);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/love-compatibility/saved", {
        method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: pair.id }),
      });
      if (!response.ok) throw new Error("Delete failed");
      await forgetSavedLoveMatch(user.uid, pair.id);
      setPairs(current => current.filter(item => item.id !== pair.id));
      setSelected(current => current?.id === pair.id ? null : current);
      setPendingDelete(null);
    } catch { setDeleteError(true); }
    finally { setDeleteBusy(false); }
  }

  return <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5" aria-labelledby="profile-love-title" dir={locale === "ar" ? "rtl" : undefined}>
    <h2 id="profile-love-title" className="font-semibold text-[var(--text)]">{nav}</h2>
    {loading ? <p className="mt-5 text-sm text-[var(--muted)]" role="status">{copy.loading}</p> : null}
    {error ? <div className="mt-5 flex flex-wrap items-center gap-3 text-sm"><span role="alert" className="text-red-500">{copy.error}</span><button type="button" className="underline underline-offset-4" onClick={() => { setLoading(true); setError(false); setRetry(value => value + 1); }}>{copy.retry}</button></div> : null}
    {!loading && !error && pairs.length === 0 ? <p className="mt-5 text-sm text-[var(--muted)]">{copy.empty}</p> : null}
    {!loading && !error && pairs.length > 0 ? <div className={styles.row}>
      {pairs.map(pair => <article className={styles.card} key={pair.id} data-has-status={isRelationshipStatus(pair.status)}>
        <button type="button" className={styles.remove} aria-label={formatMessage(copy.remove, { you: pair.you, them: pair.them })} onClick={() => { setDeleteError(false); setPendingDelete(pair); }}><X size={12} strokeWidth={2.5} aria-hidden="true" /></button>
        <button type="button" className={styles.pair} onClick={() => setSelected(pair)} aria-label={formatMessage(copy.open, { you: pair.you, them: pair.them })}>
          <span className={styles.ringCluster}>
            <span className={styles.rings} aria-hidden="true"><span>{loveMatchInitial(pair.you)}</span><span>{loveMatchInitial(pair.them)}</span></span>
            {isRelationshipStatus(pair.status) ? <span className={styles.status}>{reading.statuses[pair.status]}</span> : null}
          </span>
          <span className={styles.names}>{pair.you} · {pair.them}</span>
          <strong>{pair.match.overall}%</strong>
        </button>
      </article>)}
    </div> : null}
    {pendingDelete ? <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4" role="presentation" onClick={() => { if (!deleteBusy) setPendingDelete(null); }}>
      <div className={styles.confirm} role="dialog" aria-modal="true" aria-labelledby="profile-love-delete" onClick={event => event.stopPropagation()} dir={locale === "ar" ? "rtl" : "ltr"}>
        <h3 id="profile-love-delete">{copy.confirmTitle}</h3>
        <p>{formatMessage(copy.confirmBody, { you: pendingDelete.you, them: pendingDelete.them })}</p>
        {deleteError ? <p className={styles.deleteError} role="alert">{copy.deleteError}</p> : null}
        <div className={styles.confirmActions}>
          <button type="button" onClick={() => setPendingDelete(null)} disabled={deleteBusy}>{copy.cancel}</button>
          <button type="button" onClick={() => void removePair(pendingDelete)} disabled={deleteBusy}>{copy.confirmDelete}</button>
        </div>
      </div>
    </div> : null}
    {selected ? <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation" onClick={() => setSelected(null)}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="profile-love-reading" onClick={event => event.stopPropagation()} dir={locale === "ar" ? "rtl" : "ltr"}>
        <button type="button" className={styles.close} aria-label={copy.close} onClick={() => setSelected(null)}><X size={18} aria-hidden="true" /></button>
        <p className={styles.eyebrow}>{reading.resultEyebrow}</p>
        <h3 id="profile-love-reading">{formatMessage(reading.resultTitle, { you: selected.you, them: selected.them })}</h3>
        <p className={styles.overall}>{selected.match.overall}% · {reading.overallMatch}</p>
        <p>{selected.match.summary}</p>
        <div className={styles.scores}>
          {selected.match.scores.map(item => <div key={item.dimension}>
            <div className={styles.scoreLine}><span>{reading.dimensions[item.dimension]}</span><strong>{item.score}%</strong></div>
            <span className={styles.track}><span style={{ width: `${item.score}%` } as CSSProperties} /></span>
          </div>)}
        </div>
        <h4>{reading.strengthTitle}</h4><p>{selected.match.strength}</p>
        <h4>{reading.growthTitle}</h4><p>{selected.match.growth}</p>
        <h4>{reading.reflectionTitle}</h4><p>{selected.match.reflection}</p>
      </div>
    </div> : null}
  </section>;
}
