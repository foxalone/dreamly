"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAdditionalUserInfo, onAuthStateChanged, type User } from "firebase/auth";
import { Loader2, LogIn } from "lucide-react";

import { auth } from "@/lib/firebase";
import { clearAdUnlockPending, clearOfferwallEntitlement, isOfferwallElement, safeNext, peekAdUnlockPending } from "@/lib/adUnlock";
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

type Phase = "waiting" | "showing" | "granting" | "done" | "unavailable" | "failed";

// How long Google gets to render the Offerwall before we give up.
const APPEAR_TIMEOUT_MS = 12_000;
const POLL_MS = 300;
const GOOGLE_RETURN_KEY = "dreamly:adGoogleReturn";

function kindFrom(value: string | null): PaywallKind {
  return value === "save" ? "save" : value === "translate" ? "translate" : "analysis";
}

/**
 * The user already picked "Watch ad" on Dreamly's own paywall, so the
 * Offerwall's intermediate "Unlock more content → View a short ad" screen is
 * a second, redundant click. Press its single rewarded option automatically
 * as soon as it renders; if the button cannot be found the screen simply
 * stays and the user clicks it manually (the old behavior).
 */
function clickOfferwallCta(): boolean {
  const roots = document.querySelectorAll<HTMLElement>('[class*="fc-"], [id^="fc-"]');
  for (const root of roots) {
    if (!isOfferwallElement(root)) continue;
    const candidates = root.querySelectorAll<HTMLElement>('button, [role="button"], [class*="rewarded"]');
    for (const el of candidates) {
      const label = `${el.className} ${el.textContent ?? ""}`.toLowerCase();
      if (/reward|watch|view a short ad|short ad/.test(label)) {
        el.click();
        return true;
      }
    }
  }
  return false;
}

function offerwallVisible(): boolean {
  const nodes = document.querySelectorAll<HTMLElement>('[class*="fc-"], [id^="fc-"]');
  for (const el of nodes) {
    if (!isOfferwallElement(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width * r.height > 10_000 && getComputedStyle(el).visibility !== "hidden") return true;
  }
  return false;
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
  const next = safeNext(sp.get("next"));
  const localeParam = sp.get("locale");
  const locale = isLocale(localeParam) ? localeParam : localeFromPathname(next);
  const t = getMessages(locale);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [signInBusy, setSignInBusy] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const report = useRef<ReturnType<typeof analysisAttemptReporter> | null>(null);
  useEffect(() => {
    if (kind !== "analysis" || report.current) return;
    report.current = analysisAttemptReporter();
    report.current("ad_page_opened");
  }, [kind]);
  useEffect(() => {
    if (kind === "analysis" && user === null && (phase === "unavailable" || phase === "failed")) report.current?.("ad_signin_available");
  }, [kind, user, phase]);
  const rewardId = useRef<string>("");
  const autoClicked = useRef(false);
  const pending = useRef<ReturnType<typeof peekAdUnlockPending> | undefined>(undefined);
  if (pending.current === undefined) pending.current = kind === "translate" ? peekAdUnlockPending("translate") : null;
  if (!rewardId.current) rewardId.current = crypto.randomUUID();

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  useEffect(() => { router.prefetch(next); }, [next, router]);

  // Android's Google flow reloads this page. Resume the same destination after
  // authentication instead of starting another ad or showing another sign-in.
  useEffect(() => {
    if (!user) return;
    try {
      const raw = sessionStorage.getItem(GOOGLE_RETURN_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { next: string; atMs: number };
      sessionStorage.removeItem(GOOGLE_RETURN_KEY);
      if (saved.next !== next || Date.now() - saved.atMs > 10 * 60_000) return;
      report.current?.("auth_succeeded");
      void ensureUserProfileOnSignIn(user).then(() => router.replace(next));
    } catch {
      // A normal popup sign-in does not need session storage.
    }
  }, [user, next, router]);

  // Watch the DOM for the Offerwall overlay.
  useEffect(() => {
    if (phase !== "waiting" && phase !== "showing") return;
    let seen = phase === "showing";
    const started = Date.now();
    const tick = () => {
      const visible = offerwallVisible();
      if (!seen) {
        if (visible) {
          seen = true;
          trackEvent("offerwall_shown", { kind });
          report.current?.("ad_shown");
          setPhase("showing");
        } else if (Date.now() - started > APPEAR_TIMEOUT_MS) {
          trackEvent("offerwall_unavailable", { kind });
          report.current?.("ad_unavailable");
          setPhase("unavailable");
        }
        if (!seen) return;
      }
      // Skip Google's "View a short ad" choice screen — start the ad at once.
      if (visible && !autoClicked.current && clickOfferwallCta()) {
        autoClicked.current = true;
        trackEvent("offerwall_auto_start", { kind });
      }
      if (!visible) setPhase("granting");
    };
    // React as soon as Google inserts or changes its overlay. Polling remains
    // as a fallback for visibility changes that don't mutate the DOM.
    let frame = 0;
    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; tick(); });
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden"] });
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === "waiting" || phase === "showing"]);

  // Book the selected action once the Offerwall closed (and auth state is known).
  useEffect(() => {
    if (phase !== "granting" || user === undefined) return;
    const translation = kind === "translate" && pending.current?.dreamId && pending.current?.targetLang
      ? { sharedDreamId: pending.current.dreamId, targetLang: pending.current.targetLang }
      : kind === "translate" && sp.get("sharedDreamId") && sp.get("targetLang")
        ? { sharedDreamId: sp.get("sharedDreamId")!, targetLang: sp.get("targetLang")! }
        : null;
    if (kind === "translate" && !translation) { setPhase("failed"); return; }
    let cancelled = false;
    (async () => {
      try {
        let res: Response;
        if (user) {
          const idToken = await user.getIdToken();
          res = await fetch("/api/dreams/ad-reward", {
            method: "POST",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken, kind, rewardId: rewardId.current, attemptId: kind === "analysis" ? pendingAnalysisAttemptId() : undefined, ...translation }),
          });
        } else {
          res = await fetch("/api/dreams/guest-ad-reward", {
            method: "POST",
            credentials: "same-origin",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, rewardId: rewardId.current, attemptId: kind === "analysis" ? pendingAnalysisAttemptId() : undefined, ...translation }),
          });
        }
        if (cancelled) return;
        if (!res.ok) {
          report.current?.("ad_reward_failed");
          trackEvent("offerwall_grant_failed", { kind, status: res.status });
          setPhase("failed");
          return;
        }
        report.current?.("ad_reward_confirmed");
        trackEvent("rewarded_ad_granted", { source: `offerwall_${kind}` });
        clearOfferwallEntitlement();
        setPhase("done");
        router.replace(next);
      } catch {
        report.current?.("ad_reward_failed");
        if (!cancelled) setPhase("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, user, kind, next, router, sp]);

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
          sessionStorage.setItem(GOOGLE_RETURN_KEY, JSON.stringify({ next, atMs: Date.now() }));
        } catch {
          // Google authentication can still proceed without storage.
        }
      }, onAuthEvent: (event) => report.current?.(event) });
      if (!credential) return;
      await ensureUserProfileOnSignIn(credential.user);
      trackAuth(!!getAdditionalUserInfo(credential)?.isNewUser);
      router.replace(next);
    } catch (error) {
      if ((error as { code?: string }).code === "auth/popup-closed-by-user") return;
      try { sessionStorage.removeItem(GOOGLE_RETURN_KEY); } catch { /* ignore */ }
      setSignInError(error instanceof Error ? error.message : t.game.error);
    } finally {
      setSignInBusy(false);
    }
  }

  const m = t.adUnlock;
  const text =
    phase === "done"
      ? m.done
      : phase === "unavailable"
        ? m.none
        : phase === "failed"
          ? t.plansModal.adFailed
          : phase === "showing"
            ? m.watching
            : m.waiting;

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
        <h1 className="text-lg font-semibold">{m.title}</h1>
        <p role="status" className="mt-3 text-sm text-[var(--muted)]">
          {text}
        </p>
        {phase === "waiting" || phase === "showing" || phase === "granting" ? (
          <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--text)]/60" />
          </div>
        ) : null}
        {phase === "unavailable" || phase === "failed" ? (
          <>
            <button type="button" disabled={signInBusy} className="dream-primary-btn mt-5 flex h-12 w-full items-center justify-center gap-3 disabled:opacity-60" onClick={() => {
              // An unavailable/failed ad did not buy an analysis. Returning to
              // the journal must not consume the retry and reopen the ad flow.
              if (kind === "analysis") {
                report.current?.("back");
                clearAdUnlockPending();
              }
              router.replace(next);
            }}>
              {m.back}
            </button>
            {user === null ? (
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
          </>
        ) : null}
        {signInError ? <p role="alert" className="mt-3 text-sm text-red-500">{signInError}</p> : null}
      </div>
    </main>
  );
}
