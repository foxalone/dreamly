"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { isOfferwallElement, safeNext } from "@/lib/adUnlock";
import { trackEvent } from "@/lib/analytics";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import type { PaywallKind } from "@/lib/paywall";

type Phase = "waiting" | "showing" | "granting" | "done" | "unavailable" | "failed";

// How long Google gets to render the Offerwall before we give up.
const APPEAR_TIMEOUT_MS = 12_000;
const POLL_MS = 300;

function kindFrom(value: string | null): PaywallKind {
  return value === "save" ? "save" : value === "translate" ? "translate" : "analysis";
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
 * the ad credit (same routes as the GPT rewarded flow) and goes back.
 * "Closed" means watched: the Offerwall is published without a dismiss option.
 */
export default function AdUnlockClient() {
  const t = useMessages();
  const router = useRouter();
  const sp = useSearchParams();
  const kind = kindFrom(sp.get("kind"));
  const next = safeNext(sp.get("next"));
  const [phase, setPhase] = useState<Phase>("waiting");
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const rewardId = useRef<string>("");
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
      if (!visible) setPhase("granting");
    };
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === "waiting" || phase === "showing"]);

  // Book the credit once the Offerwall closed (and auth state is known).
  useEffect(() => {
    if (phase !== "granting" || user === undefined) return;
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
            body: JSON.stringify({ idToken, kind, rewardId: rewardId.current }),
          });
        } else {
          res = await fetch("/api/dreams/guest-ad-reward", {
            method: "POST",
            credentials: "same-origin",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, rewardId: rewardId.current }),
          });
        }
        if (cancelled) return;
        if (!res.ok) {
          trackEvent("offerwall_grant_failed", { kind, status: res.status });
          setPhase("failed");
          return;
        }
        trackEvent("rewarded_ad_granted", { source: `offerwall_${kind}` });
        setPhase("done");
        setTimeout(() => router.replace(next), 600);
      } catch {
        if (!cancelled) setPhase("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, user, kind, next, router]);

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
      </div>
    </main>
  );
}
