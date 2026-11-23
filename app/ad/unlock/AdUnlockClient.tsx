"use client";

import AdWaitBar from "@/app/components/AdWaitBar";
import YourFitPromo from "@/app/components/YourFitPromo";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAdditionalUserInfo, onAuthStateChanged, type User } from "firebase/auth";
import { Loader2, LogIn } from "lucide-react";

import { auth } from "@/lib/firebase";
import { analysisAdReturnPath, clearAdUnlockPending, markAdUnlockReady, clearOfferwallEntitlement, safeNext, peekAdUnlockPending } from "@/lib/adUnlock";
import { readHomeDreamQueue, writeHomeDreamPending } from "@/lib/homeDreamPending";
import { trackAuth, trackEvent } from "@/lib/analytics";
import { ensureUserProfileOnSignIn } from "@/lib/auth/ensureUserProfile";
import { signInWithOptions } from "@/lib/auth/signInWithOptions";
import { isDreamlyAndroidApp } from "@/lib/auth/isDreamlyAndroidApp";
import { isLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { localeFromPathname } from "@/lib/i18n/path";
import type { PaywallKind } from "@/lib/paywall";
import { analysisAttemptReporter, pendingAnalysisAttemptId } from "@/lib/reportAnalysisAttempt";
import { captureOfferwallDeparture, recoverOfferwallSession, startOfferwallSession, updateOfferwallSession } from "@/lib/offerwallSession";
import { offerwallVisible } from "@/lib/offerwallVisibility";
import { markLoveMatchAdReady } from "@/lib/loveMatchAd";
import PlansModal from "@/app/components/PlansModal";
import type { OneTimePurchase } from "@/app/components/OneTimePurchaseButton";
import { actionPurchaseCopy } from "@/lib/i18n/action-purchase";
import { isJaDreamFormPath } from "@/lib/jaPilotPaths";
import FeaturedAyetFallback, { type FeaturedFallbackOutcome } from "./FeaturedAyetFallback";

type Phase = "waiting" | "showing" | "checking" | "house-ad" | "granting" | "done" | "unavailable" | "failed";

// How long Google gets to render the Offerwall before we give up.
const APPEAR_TIMEOUT_MS = 12_000;
const FEATURED_AYET_APPEAR_TIMEOUT_MS = 6_000;
const POLL_MS = 300;
const GOOGLE_RETURN_KEY = "dreamly:adGoogleReturn";
const japaneseAdCopy = {
  title: "広告を見て夢を読み解く",
  waiting: "広告を読み込んでいます…",
  watching: "広告が終わると元のページに戻ります。",
  stalled: "広告の読み込みに時間がかかっています。",
  done: "元のページに戻っています…",
  none: "現在表示できる広告がありません。時間をおいて、もう一度お試しください。",
  dailyLimit: "本日の広告視聴の上限に達しました。",
  failed: "広告での利用を確認できませんでした。もう一度お試しください。",
  back: "夢の入力に戻る",
};

function kindFrom(value: string | null): PaywallKind | "horoscope" | "featured" | "tarot" | "love-match" {
  if (value === "horoscope") return "horoscope";
  if (value === "featured") return "featured";
  if (value === "tarot") return "tarot";
  if (value === "love-match") return "love-match";
  if (value === "save" || value === "translate" || value === "reading") return value;
  return "analysis";
}

/**
 * Waits for the AdSense Offerwall to show and close on this page, then books
 * the selected action (same routes as the GPT rewarded flow) and goes back.
 * "Closed" means watched: the Offerwall is published without a dismiss option.
 */
export default function AdUnlockClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const kind = kindFrom(sp.get("kind"));
  const requestedNext = safeNext(sp.get("next"));
  const localeParam = sp.get("locale");
  const locale = isLocale(localeParam) ? localeParam : localeFromPathname(requestedNext);
  const next = kind === "analysis" ? analysisAdReturnPath(requestedNext, locale) : requestedNext;
  const japanese = kind === "analysis" && isJaDreamFormPath(next);
  const back = kind === "tarot" ? safeNext(sp.get("back")) : next;
  const t = getMessages(locale);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [houseEligible, setHouseEligible] = useState(false);
  const [houseBusy, setHouseBusy] = useState(false);
  const [houseError, setHouseError] = useState(false);
  const houseRequestInFlight = useRef(false);
  const [adStalled, setAdStalled] = useState(false);
  const [adDailyLimit, setAdDailyLimit] = useState(false);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [signInBusy, setSignInBusy] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [showPaidChoices, setShowPaidChoices] = useState(true);
  const [featuredFallbackFinished, setFeaturedFallbackFinished] = useState(false);
  const featuredFallbackChallenge = kind === "featured" && sp.get("ayet") === "1" ? sp.get("challenge") : null;
  const showFeaturedFallback = phase === "unavailable" && user === null && featuredFallbackChallenge && !featuredFallbackFinished;
  const watchGoogle = phase === "waiting" || phase === "showing" || (phase === "unavailable" && !!featuredFallbackChallenge);
  const handleFeaturedFallback = useCallback((outcome: FeaturedFallbackOutcome) => {
    setFeaturedFallbackFinished(true);
    if (outcome === "google-shown") setPhase("showing");
    if (outcome === "google-complete") setPhase("granting");
    if (outcome === "unlocked") {
      setPhase("done");
      router.replace(next);
    }
  }, [next, router]);
  const report = useRef<ReturnType<typeof analysisAttemptReporter> | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  useEffect(() => {
    if (kind !== "analysis" || report.current) return;
    report.current = analysisAttemptReporter();
    report.current("ad_page_opened");
  }, [kind]);
  useEffect(() => {
    if (kind !== "analysis") return;
    const leave = () => {
      const saved = captureOfferwallDeparture(document.cookie, offerwallVisible());
      if (saved?.status === "completed") report.current?.("ad_overlay_closed");
      if (phaseRef.current !== "done") report.current?.("ad_page_left");
    };
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, [kind]);
  // Record a stalled overlay without mistaking elapsed time for ad completion.
  useEffect(() => {
    if (phase !== "showing") return;
    const timer = setTimeout(() => {
      report.current?.("ad_stalled");
      setAdStalled(true);
    }, 180_000);
    return () => clearTimeout(timer);
  }, [phase]);
  useEffect(() => {
    if ((phase !== "granting" && phase !== "checking") || user !== undefined) return;
    const timer = setTimeout(() => {
      report.current?.("ad_auth_timeout");
      setPhase("failed");
    }, 20_000);
    return () => clearTimeout(timer);
  }, [phase, user]);
  useEffect(() => {
    if (!japanese && kind === "analysis" && user === null && (phase === "unavailable" || phase === "failed")) report.current?.("ad_signin_available");
  }, [japanese, kind, user, phase]);
  const rewardId = useRef<string>("");
  const pending = useRef<ReturnType<typeof peekAdUnlockPending> | undefined>(undefined);
  if (pending.current === undefined) pending.current = kind === "analysis" || kind === "translate" || kind === "reading" ? peekAdUnlockPending(kind) : null;
  if (!rewardId.current) rewardId.current = crypto.randomUUID();

  useEffect(() => {
    // A refresh after the X/grant response resumes access without another ad.
    if (pending.current?.ready && pending.current.yourfitPromo) {
      setPhase("done");
      router.replace(next);
    }
  }, [next, router]);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  useEffect(() => { if (kind !== "tarot") router.prefetch(next); }, [kind, next, router]);

  // Android's Google flow reloads this page. Resume the same destination after
  // authentication instead of starting another ad or showing another sign-in.
  useEffect(() => {
    if (!user) return;
    try {
      const raw = sessionStorage.getItem(GOOGLE_RETURN_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { next: string; atMs: number };
      sessionStorage.removeItem(GOOGLE_RETURN_KEY);
      if (saved.next !== back || Date.now() - saved.atMs > 10 * 60_000) return;
      report.current?.("auth_succeeded");
      void ensureUserProfileOnSignIn(user).then(() => {
        if (kind === "translate" || kind === "reading") markAdUnlockReady(kind);
        router.replace(back);
      });
    } catch {
      // A normal popup sign-in does not need session storage.
    }
  }, [user, back, kind, router]);

  // Watch the DOM for the Offerwall overlay.
  useEffect(() => {
    if (!watchGoogle) return;
    const saved = kind === "analysis" ? startOfferwallSession(next, rewardId.current, document.cookie) : null;
    if (saved) rewardId.current = saved.rewardId;
    // A remembered appearance is not completion: after a reload Google may
    // still need to resume an unfinished ad.
    let seen = phase === "showing";
    let timedOut = phase === "unavailable";
    const appearTimeoutMs = featuredFallbackChallenge ? FEATURED_AYET_APPEAR_TIMEOUT_MS : APPEAR_TIMEOUT_MS;
    const started = Date.now();
    const tick = () => {
      const recovered = kind === "analysis" ? recoverOfferwallSession(document.cookie) : null;
      if (recovered?.status === "granted") {
        markAdUnlockReady();
        setPhase("done");
        router.replace(recovered.next);
        return;
      }
      if (recovered?.status === "completed") {
        setPhase("granting");
        return;
      }
      const visible = offerwallVisible();
      if (!seen) {
        if (visible) {
          seen = true;
          if (kind === "analysis") updateOfferwallSession({ shown: true });
          trackEvent("offerwall_shown", { kind });
          report.current?.("ad_shown");
          setPhase("showing");
        } else if (!timedOut && Date.now() - started >= appearTimeoutMs) {
          timedOut = true;
          trackEvent("offerwall_unavailable", { kind });
          report.current?.("ad_unavailable");
          setPhase(kind === "analysis" || kind === "translate" || kind === "reading" ? "checking" : "unavailable");
        }
        if (!seen) return;
      }
      // Google owns its start button. A real click supplies browser user
      // activation for media playback and the fullscreen history entry.
      // A synthetic .click() cannot provide that activation in Safari.
      if (!visible) {
        if (kind === "analysis") updateOfferwallSession({ status: "completed" });
        report.current?.("ad_overlay_closed");
        const entitled = document.cookie.split(";").some(part => /^FCOEC=.+/.test(part.trim()));
        setPhase((kind === "horoscope" || kind === "featured" || kind === "tarot" || kind === "love-match") && !entitled ? "failed" : "granting");
      }
    };
    // React as soon as Google inserts or changes its overlay. Polling remains
    // as a fallback for visibility changes that don't mutate the DOM.
    // Do not defer this to requestAnimationFrame: Google may navigate/restore
    // the source page as it removes the overlay, before another frame runs.
    const observer = new MutationObserver(tick);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden"] });
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      observer.disconnect();
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchGoogle, featuredFallbackChallenge]);

  // Book the selected action once the Offerwall closed (and auth state is known).
  useEffect(() => {
    if (phase !== "granting" || user === undefined) return;
    const translation = kind === "translate" && pending.current?.dreamId && pending.current?.targetLang
      ? { sharedDreamId: pending.current.dreamId, targetLang: pending.current.targetLang }
      : kind === "translate" && sp.get("sharedDreamId") && sp.get("targetLang")
        ? { sharedDreamId: sp.get("sharedDreamId")!, targetLang: sp.get("targetLang")! }
        : null;
    if (kind === "translate" && !translation) { setPhase("failed"); return; }
    const readingId = kind === "reading" ? (pending.current?.dreamId || sp.get("sharedDreamId") || "") : "";
    if (kind === "reading" && !readingId) { setPhase("failed"); return; }
    let cancelled = false;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
      report.current?.("ad_grant_timeout");
      if (!cancelled) setPhase("failed");
    }, 20_000);
    report.current?.("ad_grant_started");
    (async () => {
      try {
        let res: Response;
        if (kind === "horoscope" || kind === "featured" || kind === "tarot" || kind === "love-match") {
          const headers: Record<string,string> = {"Content-Type":"application/json",[kind === "tarot" ? "x-tarot-request" : "x-horoscope-request"]:"1"};
          if (kind === "love-match") {
            delete headers["x-horoscope-request"];
            headers["x-love-match-request"] = "1";
          }
          if(user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
          res = await fetch(kind === "horoscope" ? "/api/horoscope/ad" : kind === "featured" ? "/api/featured-horoscope/ad" : kind === "tarot" ? "/api/tarot/ad" : "/api/love-compatibility/ad", {method:"POST",headers,body:JSON.stringify({action:"complete",challenge:sp.get("challenge")})});
        } else if (user) {
          const idToken = await user.getIdToken();
          res = await fetch("/api/dreams/ad-reward", {
            method: "POST",
            keepalive: true,
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken, kind, rewardId: rewardId.current, attemptId: kind === "analysis" ? pendingAnalysisAttemptId() : undefined, ...translation, ...(readingId ? { sharedDreamId: readingId } : {}) }),
          });
        } else {
          res = await fetch("/api/dreams/guest-ad-reward", {
            method: "POST",
            credentials: "same-origin",
            keepalive: true,
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, rewardId: rewardId.current, attemptId: kind === "analysis" ? pendingAnalysisAttemptId() : undefined, ...translation, ...(readingId ? { sharedDreamId: readingId } : {}) }),
          });
        }
        if (cancelled) return;
        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          setAdDailyLimit(res.status === 429 && error.code === "AD_DAILY_LIMIT");
          report.current?.("ad_grant_rejected", { httpStatus: res.status });
          trackEvent("offerwall_grant_failed", { kind, status: res.status });
          setPhase("failed");
          return;
        }
        if(kind === "horoscope") {
          const grant = await res.json();
          await fetch("/api/horoscope/request",{method:"POST",headers:{"Content-Type":"application/json","x-horoscope-request":"1"},body:JSON.stringify({sign:grant.sign,locale})});
        }
        if (kind === "love-match" && !markLoveMatchAdReady(sp.get("challenge") || "")) {
          setPhase("failed");
          return;
        }
        report.current?.("ad_reward_confirmed");
        trackEvent("rewarded_ad_granted", { source: `offerwall_${kind}` });
        if (kind === "analysis") {
          updateOfferwallSession({ status: "granted" });
        }
        if (kind === "analysis" || kind === "translate" || kind === "reading") markAdUnlockReady(kind);
        clearOfferwallEntitlement();
        setPhase("done");
        report.current?.("ad_resume_started");
        if (kind === "tarot") window.location.replace(next);
        else router.replace(next);
      } catch {
        if (!timedOut) report.current?.("ad_grant_network_failed");
        if (!cancelled) setPhase("failed");
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => {
      cancelled = true;
      // A pending grant may still succeed after navigation; do not abort it.
    };
  }, [phase, user, kind, next, router, sp, locale]);

  // Keep loading until the server has decided eligibility. Do not flash access
  // choices while the first-free fallback is still being checked.
  useEffect(() => {
    if (phase !== "checking" || user === undefined) return;
    if (kind !== "analysis" && kind !== "translate" && kind !== "reading") { setPhase("unavailable"); return; }
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    void (async () => {
      const idToken = user ? await user.getIdToken() : undefined;
      return fetch(user ? "/api/dreams/ad-reward" : "/api/dreams/guest-ad-reward", {
        method: "POST",
        credentials: "same-origin",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, noAdAvailable: true, checkOnly: true, idToken,
          dreamId: pending.current?.dreamId, dreamText: pending.current?.dreamText,
          attemptId: kind === "analysis" ? pendingAnalysisAttemptId() : undefined,
          sharedDreamId: pending.current?.dreamId || sp.get("sharedDreamId"),
          targetLang: pending.current?.targetLang || sp.get("targetLang"),
        }),
      });
    })().then(async (res) => {
      const data = res.ok ? await res.json() : null;
      if (cancelled) return;
      const eligible = data?.firstAnalysisFree === true || data?.yourfitPromo === true;
      setHouseEligible(eligible);
      if (eligible) {
        trackEvent("yourfit_promo_eligible", { campaign: `first_${kind}_no_ad`, placement: `${user ? "account" : "guest"}_${kind === "analysis" ? "dream" : kind}_result`, language: locale });
      }
      setPhase(eligible || kind === "analysis" ? "house-ad" : "unavailable");
    }).catch(() => {
      if (!cancelled) setPhase(kind === "analysis" ? "house-ad" : "failed");
    }).finally(() => clearTimeout(timeout));
    return () => { cancelled = true; controller.abort(); clearTimeout(timeout); };
  }, [phase, user, kind, next, router, locale, sp]);

  async function closeHouseAd() {
    if (phase !== "house-ad" || houseRequestInFlight.current || user === undefined) return;
    if (kind !== "analysis" && kind !== "translate" && kind !== "reading") return;
    if (!houseEligible) {
      setPhase("unavailable");
      return;
    }
    houseRequestInFlight.current = true;
    setHouseBusy(true);
    setHouseError(false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const idToken = user ? await user.getIdToken() : undefined;
      const res = await fetch(user ? "/api/dreams/ad-reward" : "/api/dreams/guest-ad-reward", {
        method: "POST", credentials: "same-origin", signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, noAdAvailable: true, idToken,
          dreamId: pending.current?.dreamId, dreamText: pending.current?.dreamText,
          attemptId: kind === "analysis" ? pendingAnalysisAttemptId() : undefined,
          sharedDreamId: pending.current?.dreamId || sp.get("sharedDreamId"),
          targetLang: pending.current?.targetLang || sp.get("targetLang"),
        }),
      });
      if (res.status === 403 || res.status === 429) { setPhase("unavailable"); return; }
      const data = res.ok ? await res.json() : null;
      if (data?.firstAnalysisFree !== true && data?.yourfitPromo !== true) throw new Error("HOUSE_AD_GRANT_FAILED");
      trackEvent("yourfit_promo_closed", { campaign: `first_${kind}_no_ad`, placement: `${user ? "account" : "guest"}_${kind === "analysis" ? "dream" : kind}_result`, language: locale, format: "interstitial", visible_seconds: 5 });
      markAdUnlockReady(kind, true);
      setPhase("done");
      report.current?.("ad_resume_started");
      router.replace(next);
    } catch {
      // Retry X after a network failure without making the viewer wait again.
      setHouseError(true);
    } finally {
      clearTimeout(timeout);
      houseRequestInFlight.current = false;
      setHouseBusy(false);
    }
  }

  async function signIn() {
    if (signInBusy) return;
    setSignInBusy(true);
    setSignInError(null);
    const action = kind === "analysis" ? peekAdUnlockPending("analysis") : null;
    if (action?.dreamText) {
      const dream = readHomeDreamQueue().find((item) => item.text === action.dreamText);
      if (dream && !dream.analysis) writeHomeDreamPending(dream.text, { resumeAnalysis: true });
      // Sign-in resumes via the journal import; no ad reward was granted.
      clearAdUnlockPending();
    }
    try {
      const credential = await signInWithOptions({ beforeGoogle: () => {
        if (!isDreamlyAndroidApp()) return;
        try {
          sessionStorage.setItem(GOOGLE_RETURN_KEY, JSON.stringify({ next: back, atMs: Date.now() }));
        } catch {
          // Google authentication can still proceed without storage.
        }
      }, onAuthEvent: (event) => report.current?.(event) });
      if (!credential) return;
      await ensureUserProfileOnSignIn(credential.user);
      trackAuth(!!getAdditionalUserInfo(credential)?.isNewUser);
      if (kind === "translate" || kind === "reading") markAdUnlockReady(kind);
      router.replace(back);
    } catch (error) {
      if ((error as { code?: string }).code === "auth/popup-closed-by-user") return;
      try { sessionStorage.removeItem(GOOGLE_RETURN_KEY); } catch { /* ignore */ }
      setSignInError(error instanceof Error ? error.message : t.game.error);
    } finally {
      setSignInBusy(false);
    }
  }

  const m = japanese ? japaneseAdCopy : t.adUnlock;
  const oneTime: OneTimePurchase = {
    kind,
    challenge: sp.get("challenge") ?? undefined,
    sharedDreamId: sp.get("sharedDreamId") ?? pending.current?.dreamId ?? undefined,
    targetLang: sp.get("targetLang") ?? pending.current?.targetLang ?? undefined,
    next,
  };
  const text =
    phase === "done"
      ? m.done
      : phase === "unavailable"
        ? showFeaturedFallback ? m.waiting : m.none
        : phase === "failed"
          ? adDailyLimit ? m.dailyLimit : japanese ? japaneseAdCopy.failed : t.plansModal.adFailed
          : phase === "showing"
            ? adStalled ? m.stalled : m.watching
            : m.waiting;

  if (phase === "house-ad" && (kind === "analysis" || kind === "translate" || kind === "reading")) {
    return <main className="min-h-screen bg-[var(--bg)]">
      <YourFitPromo kind={kind} locale={locale} audience={user ? "account" : "guest"}
        attemptId={kind === "analysis" && houseEligible ? pendingAnalysisAttemptId() : undefined}
        unlocksAnalysis={kind !== "analysis" || houseEligible}
        targetKey={`${pending.current?.dreamId ?? sp.get("sharedDreamId") ?? ""}:${pending.current?.targetLang ?? sp.get("targetLang") ?? ""}`}
        busy={houseBusy} error={houseError ? (japanese ? japaneseAdCopy.failed : t.plansModal.adFailed) : undefined} onClose={() => { void closeHouseAd(); }} />
    </main>;
  }

  return (
    <main lang={japanese ? "ja" : undefined} className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
        <h1 className="text-lg font-semibold">{m.title}</h1>
        <p role="status" className="mt-3 text-sm text-[var(--muted)]">
          {text}
        </p>
        {showFeaturedFallback ? <FeaturedAyetFallback challenge={featuredFallbackChallenge} locale={locale} title={m.title} cancelLabel={t.plansModal.notNow} onOutcome={handleFeaturedFallback} /> : null}
        {phase === "waiting" || phase === "checking" || phase === "granting" ? (
          <div className="mt-5"><AdWaitBar label={text} /></div>
        ) : null}
        {!showFeaturedFallback && (phase === "unavailable" || phase === "failed" || (phase === "showing" && adStalled)) ? (
          <>
            <button type="button" disabled={signInBusy} className="dream-primary-btn mt-5 flex h-12 w-full items-center justify-center gap-3 disabled:opacity-60" onClick={() => {
              if (kind === "analysis") report.current?.("back");
              // Keep the journal draft, but discard actions that would auto-retry.
              if (kind === "analysis" || kind === "translate" || kind === "reading") clearAdUnlockPending(kind);
              router.replace(back);
            }}>
              {m.back}
            </button>
            {!japanese && user === null ? (
              <button
                type="button"
                disabled={signInBusy}
                className="dream-primary-btn mt-3 flex h-12 w-full items-center justify-center gap-3 disabled:opacity-60"
                onClick={signIn}
              >
                {signInBusy ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <LogIn size={20} aria-hidden="true" />}
                <span>{t.common.signIn}</span>
              </button>
            ) : null}
            {!japanese && phase === "unavailable" && !showPaidChoices ? (
              <button type="button" className="dream-btn dream-btn--neutral mt-3 w-full" onClick={() => setShowPaidChoices(true)}>{actionPurchaseCopy[locale].title} · $0.99</button>
            ) : null}
          </>
        ) : null}
        {signInError ? <p role="alert" className="mt-3 text-sm text-red-500">{signInError}</p> : null}
      </div>
      <PlansModal
        open={!japanese && !showFeaturedFallback && phase === "unavailable" && showPaidChoices}
        onClose={() => setShowPaidChoices(false)}
        source={`ad_unavailable_${kind}`}
        title={m.title}
        body={m.none}
        oneTime={oneTime}
      />
    </main>
  );
}
