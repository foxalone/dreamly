"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
import { useDreamLens } from "./DreamLensChips";

export type DreamAskOptions = {
  /** GA `source` on guest_limit_reached / upgrade_prompt, e.g. "home_ask" or "symbol_inline". */
  source: string;
  /** Event fired after a successful reading, e.g. "home_dream_interpreted". */
  interpretedEvent: string;
  /** Extra params merged into the interpreted event (symbol slug, etc.). */
  eventParams?: Record<string, string | number | boolean>;
  /** Restore the device-cached dream on mount (homepage does; inline prompts don't). */
  restorePending?: boolean;
  onResultChange?: (hasResult: boolean) => void;
};

/**
 * The "write a dream → get a reading → save to journal" flow shared by the homepage
 * and the inline prompt on dictionary pages. Same API route, same guest quota,
 * same device cache that `/app/dreams` imports after sign-in.
 */
export function useDreamAsk({
  source,
  interpretedEvent,
  eventParams,
  restorePending = false,
  onResultChange,
}: DreamAskOptions) {
  const t = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const [text, setTextState] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [shareToMap, setShareToMapState] = useState(true);
  const [lens, setLens] = useDreamLens();

  useEffect(() => {
    if (!restorePending) return;
    const pending = readHomeDreamPending();
    if (!pending?.text) return;
    setTextState(pending.text);
    setShareToMapState(pending.shareToMap !== false);
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

  /** Textarea change: editing after a reading discards that reading. */
  function setText(next: string) {
    setTextState(next);
    if (analysis) {
      setAnalysis(null);
      onResultChange?.(false);
      writeHomeDreamPending(next, { analysis: "", shareToMap, lang: locale, lens });
    }
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

  function setShareToMap(next: boolean) {
    setShareToMapState(next);
    if (text.trim()) persistPending(text, analysis, next);
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

  function reset() {
    setTextState("");
    setAnalysis(null);
    setError(null);
    onResultChange?.(false);
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
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
          trackEvent("guest_limit_reached", { source });
          goToJournal(dream, true);
          return;
        }
        if (data?.code === "SUBSCRIPTION_REQUIRED" || data?.code === "INSUFFICIENT_CREDITS") {
          trackEvent("upgrade_prompt", { source });
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
            body: JSON.stringify({
              emojis: visuals.emojis,
              text: dream,
              analysis: next,
              lang: locale,
              lens,
              iconsEn: visuals.iconsEn,
              rootsEn: visuals.rootsEn,
            }),
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
      trackEvent(interpretedEvent, {
        guest: !!data.guest,
        credits_used: Number(data.cost ?? 0) || 0,
        share_to_map: shareToMap,
        pinned_to_map: pinnedToMap,
        lens,
        ...(eventParams ?? {}),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analyze failed");
    } finally {
      setBusy(false);
    }
  }

  return {
    text,
    setText,
    busy,
    error,
    analysis,
    shareToMap,
    setShareToMap,
    lens,
    chooseLens,
    submit,
    goToJournal,
    reset,
    maxChars: HOME_DREAM_MAX_CHARS,
  };
}
