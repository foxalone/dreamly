"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { safeNext, markAdUnlockReady } from "@/lib/adUnlock";
import { markLoveMatchPurchaseReady } from "@/lib/loveMatchAd";
import { trackEvent } from "@/lib/analytics";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { actionPurchaseCopy } from "@/lib/i18n/action-purchase";

export default function PurchaseReturnClient() {
  const params = useSearchParams();
  const locale = useLocale();
  const copy = actionPurchaseCopy[locale];
  const orderId = params.get("token") ?? "";
  const cancelled = params.get("cancel") === "1";
  const back = safeNext(params.get("next"));
  const [phase, setPhase] = useState<"confirming" | "completed" | "failed" | "expired">("confirming");
  const running = useRef(false);

  const confirm = useCallback(async () => {
    if (!orderId || running.current) { if (!orderId) setPhase("failed"); return; }
    running.current = true;
    setPhase("confirming");
    try {
      await auth.authStateReady();
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/paypal/capture-action-order", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, idToken }),
      });
      const data = await response.json().catch(() => ({})) as { ok?: boolean; kind?: string; next?: string; code?: string };
      if (data.code === "ACTION_EXPIRED") { setPhase("expired"); return; }
      if (!response.ok || !data.ok || !data.kind || !data.next) throw new Error("PAYPAL_CAPTURE_FAILED");
      if (data.kind === "analysis" || data.kind === "translate" || data.kind === "reading") markAdUnlockReady(data.kind);
      if (data.kind === "love-match") markLoveMatchPurchaseReady(orderId);
      trackEvent("purchase", { transaction_id: orderId, currency: "USD", value: 0.99, item_id: `one_time_${data.kind}` });
      setPhase("completed");
      window.location.replace(safeNext(data.next));
    } catch {
      setPhase("failed");
    } finally { running.current = false; }
  }, [orderId]);

  useEffect(() => { if (!cancelled) void confirm(); }, [cancelled, confirm]);

  return <main className="flex min-h-screen items-center justify-center px-5" dir={locale === "ar" ? "rtl" : "ltr"}>
    <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
      <h1 className="text-lg font-semibold">{copy.returnTitle}</h1>
      <p role="status" className="mt-3 text-sm text-[var(--muted)]">{cancelled ? copy.cancelled : phase === "completed" ? copy.completed : phase === "expired" ? copy.expired : phase === "failed" ? copy.failed : copy.confirming}</p>
      {!cancelled && phase === "failed" ? <button type="button" onClick={() => void confirm()} className="dream-primary-btn mt-5 w-full">{copy.retry}</button> : null}
      {cancelled || phase === "expired" ? <a href={back} className="dream-primary-btn mt-5 inline-block w-full">{copy.back}</a> : null}
    </section>
  </main>;
}
