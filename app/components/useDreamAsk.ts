"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { trackEvent } from "@/lib/analytics";
import { clampDreamText } from "@/lib/dreamLength";
import { pickDreamMapVisuals } from "@/lib/dream-map/pickDreamMapVisuals";
import { hasEnoughDreamEmojis, type DreamEmojiEntry } from "@/lib/dreamEmojiResolve";
import {
  HOME_DREAM_MAX_CHARS,
  readHomeDreamPending,
  readHomeDreamQueue,
  writeHomeDreamPending,
  type HomeDreamPending,
} from "@/lib/homeDreamPending";
import { takeAdUnlockPending } from "@/lib/adUnlock";
import { readEscapePending, writeEscapePending } from "@/lib/game/escape";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/path";
import type { DreamLens } from "@/lib/dream-lenses";
import { useDreamLens } from "./DreamLensChips";
import { openPaywall } from "@/lib/paywall";

/**
 * Anonymous share right after a reading.
 * - guest: POST /api/dreams/share-guest → public feed now, claimed on sign-in
 * - signed in: the dream is not in the journal yet, so it goes there with the
 *   share flag on and the journal import publishes it
 */
export type AnonShareStatus = "idle" | "busy" | "done" | "already" | "rejected" | "failed";

export type DreamAskOptions = {
  /** GA `source` on guest_limit_reached / upgrade_prompt, e.g. "home_ask" or "symbol_inline". */
  source: string;
  /** Event fired after a successful reading, e.g. "home_dream_interpreted". */
  interpretedEvent: string;
  /** Extra params merged into the interpreted event (symbol slug, etc.). */
  eventParams?: Record<string, string | number | boolean>;
  /** Restore the device-cached dream on mount (homepage does; inline prompts don't). */
  restorePending?: boolean;
  initialDream?: HomeDreamPending;
  redirectToJournal?: boolean;
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
  initialDream,
  redirectToJournal = false,
  onResultChange,
}: DreamAskOptions) {
  const t = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const [text, setTextState] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [shareToFeed, setShareToFeedState] = useState(true);
  const [lens, setLens] = useDreamLens();
  const [anonShare, setAnonShare] = useState<AnonShareStatus>("idle");
  /** Emojis that escaped into the dream catcher for THIS reading (null = no escape note). */
  const [escaped, setEscaped] = useState<string[] | null>(null);
  const [escapeAlreadyToday, setEscapeAlreadyToday] = useState(false);

  useEffect(() => {
    if (!restorePending && !initialDream) return;
    const pending = initialDream ?? readHomeDreamPending();
    if (!pending?.text) return;
    setTextState(pending.text);
    // The feed checkbox is ALWAYS on by default: an earlier un-tick saved in the
    // device cache must not carry over to the next dream (dima, 2026-10-10).
    if (pending.guestSharedId) setAnonShare("done");
    if (pending.lens) setLens(pending.lens);
    if (pending.analysis) {
      setAnalysis(pending.analysis);
      // The redirect from the homepage lands here: keep showing the escape note
      // as long as the creatures are still waiting in the catcher.
      const esc = readEscapePending();
      if (esc && (!esc.key || esc.key === pending.text)) setEscaped(esc.emojis);
      onResultChange?.(true);
    } else if (takeAdUnlockPending("analysis")) {
      // Back from the Offerwall (/ad/unlock): the ad credit is booked, the retry
      // closure did not survive the navigation — run the interpretation now.
      window.setTimeout(() => void submitRef.current(), 300);
    }
    // Restore once on mount so a later login still finds the same cache.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistPending(
    dream = text,
    nextAnalysis = analysis,
    nextShare = shareToFeed,
    nextLens = lens
  ) {
    writeHomeDreamPending(dream, {
      analysis: nextAnalysis ?? undefined,
      shareToFeed: nextShare,
      lang: locale,
      lens: nextLens,
    });
  }

  /** Textarea change: editing after a reading discards that reading. */
  function setText(raw: string) {
    const next = clampDreamText(raw);
    setTextState(next);
    if (analysis) {
      setAnalysis(null);
      setAnonShare("idle");
      setEscaped(null);
      setEscapeAlreadyToday(false);
      onResultChange?.(false);
      // Preserve the completed reading; save the new text when it is submitted.
    }
  }

  function chooseLens(next: DreamLens) {
    setLens(next);
    if (analysis) {
      setAnalysis(null);
      setEscapeAlreadyToday(false);
      onResultChange?.(false);
      persistPending(text, "", shareToFeed, next);
      return;
    }
    if (text.trim()) persistPending(text, analysis, shareToFeed, next);
  }

  function setShareToFeed(next: boolean) {
    setShareToFeedState(next);
    if (text.trim()) persistPending(text, analysis, next);
  }

  function goToJournal(pending = text, guestLimit = false, signIn = false) {
    persistPending(pending);
    if (guestLimit) writeHomeDreamPending(pending, { analysis: "", resumeAnalysis: true });
    const next = localePath("/app/dreams", locale);
    const user = auth.currentUser;
    if (user || (!guestLimit && !signIn)) {
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
    setAnonShare("idle");
    setEscaped(null);
    setEscapeAlreadyToday(false);
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
    setAnonShare("idle");
    setEscaped(null);
    setEscapeAlreadyToday(false);
    onResultChange?.(false);

    try {
      await auth.authStateReady();
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);
      // The dream's already-created emojis (re-analysis in the guest journal):
      // the escape must be exactly these icons, not a fresh pick.
      const storedEmojis =
        (initialDream?.text === dream ? initialDream.emojis : undefined) ??
        readHomeDreamQueue().find((item) => item.text === dream)?.emojis;
      const res = await fetch("/api/dreams/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          text: dream,
          lang: locale,
          lens,
          ...(storedEmojis?.length ? { escapeEmojis: storedEmojis.map((e) => ({ native: e.native })) } : {}),
          ...(idToken ? { idToken } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.code === "GUEST_LIMIT_REACHED") {
          trackEvent("guest_limit_reached", { source });
          persistPending(dream, "");
          openPaywall({
            kind: "analysis",
            source,
            guest: {
              reason: data.reason === "ip_limit" ? "ip_limit" : "guest_limit",
              signIn: () => goToJournal(dream, true),
            },
            retry: () => void submitRef.current(),
          });
          return;
        }
        if (data?.code === "SUBSCRIPTION_REQUIRED" || data?.code === "INSUFFICIENT_CREDITS" || data?.code === "FREE_DAILY_LIMIT") {
          // Same paywall as the journal: plans + "watch an ad" → re-run this reading.
          openPaywall({
            kind: "analysis",
            reason: data?.code === "FREE_DAILY_LIMIT" ? "daily" : "limit",
            source,
            retry: () => void submitRef.current(),
          });
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
      // Dream Kingdoms: the server granted an escape (first dream today) — remember it
      // for the catcher badge and show the note + fly-away above this reading.
      if (Number(data?.escape?.granted ?? 0) > 0) {
        const source: Array<{ native?: string }> = storedEmojis?.length
          ? storedEmojis
          : Array.isArray(data?.emojis)
            ? (data.emojis as DreamEmojiEntry[])
            : [];
        const natives = source
          .map((e) => (typeof e?.native === "string" ? e.native : ""))
          .filter(Boolean)
          .slice(0, Number(data.escape.granted));
        if (natives.length) {
          writeEscapePending({ emojis: natives, at: Date.now(), key: dream });
          setEscaped(natives);
        }
      } else if (data?.escape && Number(data.escape.granted ?? 0) === 0) {
        setEscapeAlreadyToday(true);
      }
      // The map pin happens for every dream; the checkbox only decides the feed share.
      let visuals = await pickDreamMapVisuals(dream).catch(() => null);
      // Prefer the server-side AI pick (validated against emoji-mart); the
      // keyword picker only supplies iconsEn/rootsEn and the emoji fallback.
      if (hasEnoughDreamEmojis(data?.emojis)) {
        visuals = {
          emojis: data.emojis.map((e: DreamEmojiEntry) => ({ native: e.native, id: e.id, name: e.name })),
          iconsEn: visuals?.iconsEn ?? [],
          rootsEn: visuals?.rootsEn ?? [],
        };
      }
      writeHomeDreamPending(dream, {
        analysis: next,
        shareToFeed,
        lang: locale,
        lens,
        emojis: visuals?.emojis,
        iconsEn: visuals?.iconsEn,
        rootsEn: visuals?.rootsEn,
      });

      let pinnedToMap = false;
      if (visuals?.emojis?.length) {
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
            // "skipped" = this guest already pinned a dream today (one pin per
            // guest per day) — THIS dream was not counted for the city, so the
            // import after sign-in must count it (no skipCity).
            pinnedToMap = pin?.ok === true && pin?.skipped !== true;
            writeHomeDreamPending(dream, {
              analysis: next,
              shareToFeed,
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

      // "Share anonymously in the feed" ticked: a guest's dream goes to the feed right away;
      // a signed-in user's is published by the journal import when they save it.
      if (shareToFeed && !auth.currentUser) await shareAsGuest(dream);

      onResultChange?.(true);
      trackEvent(interpretedEvent, {
        guest: !!data.guest,
        credits_used: Number(data.cost ?? 0) || 0,
        share_to_map: true,
        share_to_feed: shareToFeed,
        pinned_to_map: pinnedToMap,
        lens,
        ...(eventParams ?? {}),
      });
      if (redirectToJournal) router.push(localePath("/app/dreams", locale));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analyze failed");
    } finally {
      setBusy(false);
    }
  }

  const submitRef = useRef<(event?: FormEvent) => Promise<void>>(async () => {});
  submitRef.current = submit;

  async function shareAnonymously() {
    if (!analysis || anonShare === "busy" || anonShare === "done") return;
    const dream = text.trim();
    if (!dream) return;

    if (auth.currentUser) {
      setShareToFeedState(true);
      writeHomeDreamPending(dream, { shareToFeed: true, lang: locale, lens });
      trackEvent("share_anon_click", { source, guest: false });
      goToJournal(dream);
      return;
    }

    trackEvent("share_anon_click", { source, guest: true });
    await shareAsGuest(dream);
  }

  /** Guest → public feed now (shared_dreams/guest_{id}), claimed by the account on sign-in. */
  async function shareAsGuest(dream: string) {
    setAnonShare("busy");
    try {
      const pending = readHomeDreamQueue().find((item) => item.text === dream);
      const res = await fetch("/api/dreams/share-guest", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: dream,
          lang: locale,
          lens,
          emojis: pending?.text === dream ? pending.emojis : undefined,
          iconsEn: pending?.text === dream ? pending.iconsEn : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok && data?.sharedId) {
        writeHomeDreamPending(dream, { guestSharedId: String(data.sharedId), lang: locale, lens });
        setAnonShare("done");
        trackEvent("share", { method: "guest_anonymous", content_type: "dream" });
        return;
      }
      if (data?.code === "ALREADY_SHARED") setAnonShare("already");
      else if (data?.code === "REJECTED") setAnonShare("rejected");
      else setAnonShare("failed");
    } catch {
      setAnonShare("failed");
    }
  }

  return {
    anonShare,
    shareAnonymously,
    escaped,
    escapeAlreadyToday,
    signedIn: () => !!auth.currentUser,
    text,
    setText,
    busy,
    error,
    analysis,
    shareToFeed,
    setShareToFeed,
    lens,
    chooseLens,
    submit,
    goToJournal,
    reset,
    maxChars: HOME_DREAM_MAX_CHARS,
  };
}
