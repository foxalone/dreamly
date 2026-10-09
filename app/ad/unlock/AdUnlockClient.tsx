"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { clearOfferwallEntitlement, isOfferwallElement, safeNext, peekAdUnlockPending } from "@/lib/adUnlock";
import { trackEvent } from "@/lib/analytics";
import { isLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { localeFromPathname, localePath } from "@/lib/i18n/path";
import type { PaywallKind } from "@/lib/paywall";

type Phase = "waiting" | "showing" | "granting" | "done" | "unavailable" | "failed";

// How long Google gets to render the Offerwall before we give up.
const APPEAR_TIMEOUT_MS = 12_000;
const POLL_MS = 300;

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
  const rewardId = useRef<string>("");
  const autoClicked = useRef(false);
  const pending = useRef<ReturnType<typeof peekAdUnlockPending> | undefined>(undefined);
  if (pending.current === undefined) pending.current = kind === "translate" ? peekAdUnlockPending("translate") : null;
  if (!rewardId.current) rewardId.current = crypto.randomUUID();

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

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
          setPhase("showing");
        } else if (Date.now() - started > APPEAR_TIMEOUT_MS) {
          trackEvent("offerwall_unavailable", { kind });
          setPhase("unavailable");
        }
        return;
      }
      // Skip Google's "View a short ad" choice screen — start the ad at once.
      if (visible && !autoClicked.current && clickOfferwallCta()) {
        autoClicked.current = true;
        trackEvent("offerwall_auto_start", { kind });
      }
      if (!visible) setPhase("granting");
    };
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
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
            body: JSON.stringify({ idToken, kind, rewardId: rewardId.current, ...translation }),
          });
        } else {
          res = await fetch("/api/dreams/guest-ad-reward", {
            method: "POST",
            credentials: "same-origin",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, rewardId: rewardId.current, ...translation }),
          });
        }
        if (cancelled) return;
        if (!res.ok) {
          trackEvent("offerwall_grant_failed", { kind, status: res.status });
          setPhase("failed");
          return;
        }
        trackEvent("rewarded_ad_granted", { source: `offerwall_${kind}` });
        clearOfferwallEntitlement();
        setPhase("done");
        setTimeout(() => router.replace(next), 600);
      } catch {
        if (!cancelled) setPhase("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, user, kind, next, router, sp]);

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
          <button type="button" className="dream-primary-btn mt-5 w-full" onClick={() => router.replace(next)}>
            {m.back}
          </button>
        ) : null}
        <a href={localePath("/app/upgrade", locale)} className="mt-4 block text-sm text-[var(--muted)] underline">
          {t.plansModal.choosePlan}
        </a>
      </div>
    </main>
  );
}
