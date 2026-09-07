"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BookOpenText, Loader2, Sparkles } from "lucide-react";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { auth } from "@/lib/firebase";
import { trackEvent } from "@/lib/analytics";
import { pickDreamMapVisuals } from "@/lib/dream-map/pickDreamMapVisuals";
import {
  HOME_DREAM_MAX_CHARS,
  readHomeDreamPending,
  writeHomeDreamPending,
} from "@/lib/homeDreamPending";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/path";
import type { DreamLens } from "@/lib/dream-lenses";
import DreamLensChips, { useDreamLens } from "./DreamLensChips";

export default function HomeDreamAsk({
  onResultChange,
}: {
  onResultChange?: (hasResult: boolean) => void;
}) {
  const t = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [shareToMap, setShareToMap] = useState(true);
  const [lens, setLens] = useDreamLens();

  useEffect(() => {
    const pending = readHomeDreamPending();
    if (!pending?.text) return;
    setText(pending.text);
    setShareToMap(pending.shareToMap !== false);
    if (pending.lens) setLens(pending.lens);
    if (pending.analysis) {
      setAnalysis(pending.analysis);
      onResultChange?.(true);
    }
    // Restore once on mount so a later login still finds the same cache.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistPending(
    dream = text,
    nextAnalysis = analysis,
    nextShare = shareToMap,
    nextLens = lens
  ) {
    writeHomeDreamPending(dream, {
      analysis: nextAnalysis ?? undefined,
      shareToMap: nextShare,
      lang: locale,
      lens: nextLens,
    });
  }

  function chooseLens(next: DreamLens) {
    setLens(next);
    if (analysis) {
      setAnalysis(null);
      onResultChange?.(false);
      persistPending(text, "", shareToMap, next);
      return;
    }
    if (text.trim()) persistPending(text, analysis, shareToMap, next);
  }

  function goToJournal(pending = text, guestLimit = false) {
    persistPending(pending);
    const next = localePath("/app/dreams", locale);
    const user = auth.currentUser;
    if (user) {
      router.push(next);
      return;
    }
    const params = new URLSearchParams({ next });
    if (guestLimit) {
      params.set("reason", "guest_limit");
      params.set("cancel", localePath("/dreams", locale));
    }
    router.push(`${localePath("/signin", locale)}?${params.toString()}`);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const dream = text.trim();
    if (!dream) {
      setError(t.home.askEmpty);
      return;
    }

    setBusy(true);
    setError(null);
    setAnalysis(null);
    onResultChange?.(false);

    try {
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch("/api/dreams/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          text: dream,
          lang: locale,
          lens,
          ...(idToken ? { idToken } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.code === "GUEST_LIMIT_REACHED") {
          trackEvent("guest_limit_reached", { source: "home_ask" });
          goToJournal(dream, true);
          return;
        }
        if (data?.code === "SUBSCRIPTION_REQUIRED" || data?.code === "INSUFFICIENT_CREDITS") {
          trackEvent("upgrade_prompt", { source: "home_ask" });
          router.push(localePath("/app/upgrade", locale));
          return;
        }
        if (data?.code === "DAILY_LIMIT") {
          setError(typeof data?.error === "string" ? data.error : t.app.dailyLimitReached);
          return;
        }
        throw new Error(typeof data?.error === "string" ? data.error : "Analyze failed");
      }

      const next = String(data.analysis ?? "").trim();
      if (!next) throw new Error("Empty analysis");
      setAnalysis(next);
      const visuals = shareToMap ? await pickDreamMapVisuals(dream).catch(() => null) : null;
      writeHomeDreamPending(dream, {
        analysis: next,
        shareToMap,
        lang: locale,
        lens,
        emojis: visuals?.emojis,
        iconsEn: visuals?.iconsEn,
        rootsEn: visuals?.rootsEn,
      });

      let pinnedToMap = false;
      if (shareToMap && visuals?.emojis?.length) {
        try {
          const pinRes = await fetch("/api/map/ingest-guest", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emojis: visuals.emojis }),
          });
          const pin = await pinRes.json().catch(() => ({}));
          const cityId = String(pin?.cityId ?? "").trim();
          const city = String(pin?.city ?? "").trim();
          const country = String(pin?.country ?? "").trim();
          if (cityId && city && country) {
            pinnedToMap = pin?.ok === true;
            writeHomeDreamPending(dream, {
              analysis: next,
              shareToMap,
              lang: locale,
              lens,
              emojis: visuals.emojis,
              iconsEn: visuals.iconsEn,
              rootsEn: visuals.rootsEn,
              city: {
                cityId,
                city,
                country,
                admin1: String(pin?.admin1 ?? "").trim(),
              },
              guestMapIngested: pinnedToMap,
            });
          }
        } catch (e) {
          console.warn("guest map ingest failed", e);
        }
      }

      onResultChange?.(true);
      trackEvent("home_dream_interpreted", {
        guest: !!data.guest,
        credits_used: Number(data.cost ?? 0) || 0,
        share_to_map: shareToMap,
        pinned_to_map: pinnedToMap,
        lens,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analyze failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-xl text-start">
      <form onSubmit={onSubmit} className="rounded-3xl bg-purple-600 p-2 shadow-[0_12px_40px_rgba(124,58,237,0.28)]">
        <label className="sr-only" htmlFor="home-dream-text">
          {t.home.askPlaceholder}
        </label>
        <textarea
          id="home-dream-text"
          value={text}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            if (analysis) {
              setAnalysis(null);
              onResultChange?.(false);
              writeHomeDreamPending(next, { analysis: "", shareToMap, lang: locale, lens });
            }
          }}
          rows={4}
          maxLength={HOME_DREAM_MAX_CHARS}
          placeholder={t.home.askPlaceholder}
          disabled={busy}
          className="w-full resize-none rounded-[1.15rem] bg-white px-4 py-3.5 text-base text-zinc-900 outline-none placeholder:text-zinc-400"
        />
        <div className="px-2 pb-1 pt-2">
          <DreamLensChips value={lens} onChange={chooseLens} disabled={busy} tone="onBrand" />
        </div>
        <div className="flex flex-col gap-2 px-2 pb-1.5 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex min-w-0 cursor-pointer items-start gap-2 text-xs font-medium text-white/90">
            <input
              type="checkbox"
              checked={shareToMap}
              disabled={busy}
              onChange={(event) => {
                const next = event.target.checked;
                setShareToMap(next);
                if (text.trim()) persistPending(text, analysis, next);
              }}
              className="mt-0.5 size-3.5 shrink-0 rounded border-white/40 bg-white/15 accent-white"
            />
            <span>{t.home.askShareMap}</span>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 self-end rounded-full bg-white px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-50 disabled:opacity-70 sm:self-auto"
          >
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
            {busy ? t.home.askBusy : t.home.askSubmit}
          </button>
        </div>
      </form>

      {error ? (
        <p className="mt-3 text-center text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}

      {analysis ? null : (
        <div className="mt-4 text-center">
          <p className="mb-3 text-xs text-[var(--muted)]">{t.home.askHint}</p>
          <LocaleLink
            href="/dreams"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--text)] hover:bg-[var(--surface)]"
          >
            <BookOpenText size={16} aria-hidden="true" />
            {t.home.askOrDictionary}
          </LocaleLink>
        </div>
      )}

      {analysis ? (
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-start">
          <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text)]">{analysis}</p>
          <p className="mt-4 text-xs text-[var(--muted)]">{t.home.askCached}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => goToJournal()}
              className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
            >
              {t.home.askSave}
            </button>
            <button
              type="button"
              onClick={() => goToJournal()}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
            >
              {t.home.askMore}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
