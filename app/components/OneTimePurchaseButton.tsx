"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { actionPurchaseCopy } from "@/lib/i18n/action-purchase";
import type { ActionKind } from "@/lib/paypal/actionPurchase";
import { trackEvent } from "@/lib/analytics";

export type OneTimePurchase = {
  kind: ActionKind;
  challenge?: string;
  sharedDreamId?: string;
  targetLang?: string;
  sign?: string;
  day?: string;
  cardId?: string;
  purpose?: "read" | "translate";
  lang?: string;
  next?: string;
  onStart?: () => boolean | void;
};

export default function OneTimePurchaseButton({ purchase, className = "" }: { purchase: OneTimePurchase; className?: string }) {
  const locale = useLocale();
  const copy = actionPurchaseCopy[locale];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function buy() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      if (purchase.onStart?.() === false) throw new Error("ACTION_NOT_SAVED");
      await auth.authStateReady();
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/paypal/create-action-order", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...purchase, onStart: undefined, idToken, locale, next: purchase.next ?? window.location.pathname + window.location.search }),
      });
      const data = await response.json().catch(() => ({})) as { approveUrl?: string };
      if (!response.ok || !data.approveUrl || !data.approveUrl.startsWith("https://www.paypal.com/") && !data.approveUrl.startsWith("https://www.sandbox.paypal.com/")) throw new Error("PAYPAL_CREATE_FAILED");
      trackEvent("begin_checkout", { currency: "USD", value: 0.99, item_id: `one_time_${purchase.kind}` });
      window.location.assign(data.approveUrl);
    } catch {
      setBusy(false);
      setError(true);
    }
  }

  return (
    <div className={className}>
      <button type="button" disabled={busy} onClick={() => void buy()} className="flex h-full w-full flex-col rounded-2xl border border-violet-400/50 bg-violet-500/10 p-4 text-start transition hover:border-violet-300 hover:bg-violet-500/15 disabled:opacity-60">
        <span className="flex w-full items-baseline justify-between gap-2"><span className="text-base font-semibold text-[var(--text)]">{copy.title}</span><span className="text-lg font-semibold text-[var(--text)]">$0.99</span></span>
        <span className="mb-4 mt-1 text-sm text-[var(--muted)]">{copy.description}</span>
        <span className="dream-primary-btn mt-auto w-full text-center text-sm">{busy ? copy.starting : copy.buy}</span>
      </button>
      {error ? <p role="alert" className="mt-2 text-xs text-red-500">{copy.failed}</p> : null}
    </div>
  );
}
