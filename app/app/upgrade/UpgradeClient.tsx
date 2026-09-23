"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { auth, firestore } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { SUBSCRIPTION_PLANS, type PlanId } from "@/lib/subscriptions/plans";
import { hasPaidAccess, type UserBillingFields } from "@/lib/subscriptions/status";
import { subscriptionItem, trackEvent } from "@/lib/analytics";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import CheckoutLegalConsent from "@/app/components/CheckoutLegalConsent";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/path";

type UIStatus = "idle" | "creating" | "paying" | "success" | "error";
type UiPlanId = PlanId | "free";

function fmtMoney(price: string, currency: string) {
  const v = Number(price);
  if (!Number.isFinite(v)) return `${price} ${currency}`;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: String(currency || "USD").toUpperCase(),
    maximumFractionDigits: 2,
  }).format(v);
}

function fmtDate(ms: number | null | undefined) {
  const v = Number(ms);
  if (!Number.isFinite(v) || v <= 0) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(v));
}

function toInitialPlan(initialPkg: string | null): UiPlanId {
  if (initialPkg === "yearly" || initialPkg === "year") return "yearly";
  if (initialPkg === "free") return "free";
  return "monthly";
}

function cardClass(active: boolean) {
  return [
    "flex h-full flex-col rounded-3xl border bg-[var(--card)] border-[var(--border)] shadow-sm transition",
    active ? "ring-2 ring-[color-mix(in_srgb,var(--text)_35%,transparent)]" : "hover:opacity-95",
  ].join(" ");
}

export default function UpgradeClient({ initialPkg }: { initialPkg: string | null }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useMessages();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [uid, setUid] = useState<string | null>(null);
  const [billing, setBilling] = useState<UserBillingFields | null>(null);
  const [selected, setSelected] = useState<UiPlanId>(() => toInitialPlan(initialPkg));
  const [status, setStatus] = useState<UIStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [busyCancel, setBusyCancel] = useState(false);
  // Which action produced status === "success", so the banner does not flash
  // the "cancelled" text while the users/{uid} snapshot is still catching up.
  const [lastAction, setLastAction] = useState<"subscribe" | "cancel" | null>(null);
  // PayPal's own approval page for the last subscription we created. Shown as
  // a fallback when the Buttons popup ends on PayPal's generic error page:
  // the redirect flow comes back to /app/upgrade?subscribed=1&subscription_id=I-…
  const [approveUrl, setApproveUrl] = useState<string | null>(null);
  // subscription_id picked up from the URL after the redirect flow; activated
  // once the user is known.
  const [returnedSubscriptionId, setReturnedSubscriptionId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) {
      setBilling(null);
      return;
    }
    const unsub = onSnapshot(doc(firestore, "users", uid), (snap) => {
      setBilling(snap.exists() ? (snap.data() as UserBillingFields) : {});
    });
    return () => unsub();
  }, [uid]);

  // Redirect-flow return: PayPal sends the user back to
  // /app/upgrade?subscribed=1&subscription_id=I-…&ba_token=BA-…&token=…
  // (or ?cancelled=1). Read it once and scrub the query so a reload does not
  // re-run activation.
  useEffect(() => {
    const url = new URL(window.location.href);
    const sp = url.searchParams;
    const subscribedFlag = sp.get("subscribed") === "1";
    const cancelledFlag = sp.get("cancelled") === "1";
    const sid = (sp.get("subscription_id") || "").trim();
    if (!subscribedFlag && !cancelledFlag) return;
    if (subscribedFlag && sid) {
      setReturnedSubscriptionId(sid);
      setStatus("paying");
    } else if (subscribedFlag) {
      console.error("[paypal] returned with subscribed=1 but no subscription_id");
    }
    for (const k of ["subscribed", "cancelled", "subscription_id", "ba_token", "token"]) sp.delete(k);
    window.history.replaceState(window.history.state, "", `${url.pathname}${sp.toString() ? `?${sp}` : ""}`);
  }, []);

  const subscribed = hasPaidAccess(billing);
  // Cancelled but still inside the paid period: nothing left to cancel, so the
  // button gives way to an "access until …" note.
  const isCancelled = billing?.subscriptionStatus === "cancelled";
  const paypalClientId = (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "").trim();
  const paypalEnabled = !!paypalClientId;

  const scriptOptions = useMemo(
    () =>
      ({
        clientId: paypalClientId,
        currency: "USD",
        intent: "subscription",
        vault: true,
      }) as const,
    [paypalClientId]
  );

  async function getIdTokenOrThrow() {
    const u = auth.currentUser;
    if (!u) throw new Error(t.upgrade.signInFirst);
    const token = await u.getIdToken(true).catch(() => "");
    if (!token) throw new Error(t.app.signInRequired);
    return token;
  }

  async function activateSubscription(subscriptionID: string, planId: PlanId | null) {
    setStatus("paying");
    setError(null);
    console.info("[paypal] activate", { subscriptionID, plan: planId });
    const idToken = await getIdTokenOrThrow();
    const r = await fetch("/api/paypal/activate-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionID, idToken }),
    });
    const j = await r.json().catch(() => ({} as Record<string, unknown>));
    if (!r.ok || !j?.ok) {
      console.error("[paypal] activate failed", { subscriptionID, httpStatus: r.status, error: j?.error });
      throw new Error(String(j?.error ?? t.upgrade.paying));
    }
    console.info("[paypal] activated", {
      subscriptionID,
      paypalStatus: j?.paypalStatus,
      status: j?.status,
      pending: j?.pending,
    });
    setLastAction("subscribe");
    setApproveUrl(null);
    const plan = planId ? SUBSCRIPTION_PLANS[planId] : null;
    trackEvent("purchase", {
      transaction_id: subscriptionID,
      currency: plan?.currency ?? "USD",
      value: plan ? Number(plan.price) : 0,
      items: planId && plan ? [subscriptionItem(planId, plan.price)] : [],
    });
    setStatus("success");
  }

  // Finish the redirect flow once we know who is signed in.
  useEffect(() => {
    if (!returnedSubscriptionId || !uid) return;
    const sid = returnedSubscriptionId;
    setReturnedSubscriptionId(null);
    const planId: PlanId | null = selected === "monthly" || selected === "yearly" ? selected : null;
    activateSubscription(sid, planId).catch((e: unknown) => {
      setStatus("error");
      setError(e instanceof Error ? e.message : t.upgrade.paying);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnedSubscriptionId, uid]);

  async function cancelSubscription() {
    try {
      setBusyCancel(true);
      setError(null);
      const idToken = await getIdTokenOrThrow();
      const r = await fetch("/api/paypal/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const j = await r.json().catch(() => ({} as Record<string, unknown>));
      if (!r.ok || !j?.ok) throw new Error(String(j?.error ?? t.upgrade.cancelled));
      setLastAction("cancel");
      setStatus("success");
    } catch (e: unknown) {
      setStatus("error");
      setError(e instanceof Error ? e.message : t.upgrade.cancelled);
    } finally {
      setBusyCancel(false);
    }
  }

  function selectPlan(id: UiPlanId) {
    setSelected(id);
    setStatus("idle");
    setError(null);
    if (id === "free") return;
    const p = SUBSCRIPTION_PLANS[id];
    trackEvent("select_item", {
      item_list_id: "subscription_plans",
      item_list_name: "Subscription plans",
      items: [subscriptionItem(id, p.price)],
    });
  }

  function renderPaypal(planId: PlanId) {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (subscribed) {
      return null;
    }
    if (!uid) {
      return (
        <button
          type="button"
          onClick={() => router.push(localePath("/signin?next=/app/upgrade", locale))}
          className="dream-primary-btn w-full"
        >
          {t.upgrade.goSignIn}
        </button>
      );
    }
    if (!paypalEnabled) {
      return <div className="text-sm text-[var(--muted)]">{t.upgrade.paypalMissing}</div>;
    }
    if (!mounted) {
      return <div className="text-sm text-[var(--muted)]">{t.upgrade.creating}</div>;
    }
    return (
      <div className={`w-full ${status === "paying" ? "opacity-70 pointer-events-none" : ""}`}>
        <PayPalButtons
          style={{ layout: "vertical", label: "subscribe" }}
          forceReRender={[planId]}
          createSubscription={async () => {
            setSelected(planId);
            setError(null);
            setApproveUrl(null);
            setStatus("creating");
            trackEvent("begin_checkout", {
              currency: plan.currency,
              value: Number(plan.price),
              items: [subscriptionItem(planId, plan.price)],
            });
            try {
              const idToken = await getIdTokenOrThrow();
              const r = await fetch("/api/paypal/create-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: planId, idToken }),
              });
              const j = await r.json().catch(() => ({} as Record<string, unknown>));
              const subscriptionID = String(j?.subscriptionID ?? "").trim();
              if (!r.ok || !subscriptionID) {
                console.error("[paypal] create-subscription failed", {
                  plan: planId,
                  httpStatus: r.status,
                  code: j?.code,
                  error: j?.error,
                  paypal: j?.paypal,
                });
                throw new Error(String(j?.error ?? t.upgrade.creating));
              }
              console.info("[paypal] subscription created", { plan: planId, subscriptionID });
              setApproveUrl(typeof j?.approveUrl === "string" && j.approveUrl ? j.approveUrl : null);
              setStatus("idle");
              return subscriptionID;
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : t.upgrade.creating;
              setStatus("error");
              setError(message);
              // Rethrow so the SDK aborts the popup and calls onError instead
              // of opening PayPal with an empty subscription id.
              throw e instanceof Error ? e : new Error(message);
            }
          }}
          onApprove={async (data) => {
            try {
              const subscriptionID = String(data?.subscriptionID ?? "").trim();
              console.info("[paypal] onApprove", {
                plan: planId,
                subscriptionID,
                orderID: data?.orderID ?? null,
              });
              if (!subscriptionID) throw new Error("Missing subscriptionID from PayPal.");
              await activateSubscription(subscriptionID, planId);
            } catch (e: unknown) {
              setStatus("error");
              setError(e instanceof Error ? e.message : t.upgrade.paying);
            }
          }}
          onCancel={(data) => {
            console.info("[paypal] onCancel", { plan: planId, subscriptionID: data?.subscriptionID ?? null });
            setStatus("idle");
          }}
          onError={(err) => {
            const message = err instanceof Error ? err.message : String(err ?? "");
            console.error("[paypal] onError", { plan: planId, message, hasApproveUrl: !!approveUrl });
            setStatus("error");
            // Keep the more specific message set by createSubscription, if any.
            setError((prev) => prev ?? "PayPal error. Please try again.");
          }}
        />
        {status === "error" && approveUrl && selected === planId ? (
          <a
            href={approveUrl}
            rel="noopener"
            onClick={() => console.info("[paypal] redirect fallback", { plan: planId })}
            className="dream-btn dream-btn--neutral mt-3 block w-full text-center text-sm no-underline"
          >
            {t.upgrade.openPaypalPage}
          </a>
        ) : null}
        {status === "creating" && selected === planId ? (
          <div className="mt-3 text-sm text-[var(--muted)]">{t.upgrade.creating}</div>
        ) : null}
        {status === "paying" && selected === planId ? (
          <div className="mt-3 text-sm text-[var(--muted)]">{t.upgrade.paying}</div>
        ) : null}
      </div>
    );
  }

  const paidCards = (Object.keys(SUBSCRIPTION_PLANS) as PlanId[]).map((id) => {
    const p = SUBSCRIPTION_PLANS[id];
    const active = selected === id;
    return (
      <article key={id} className={cardClass(active)}>
        <button type="button" onClick={() => selectPlan(id)} className="w-full p-5 text-left">
          <div className="text-lg font-semibold text-[var(--text)]">
            {id === "yearly" ? t.pricing.yearly : t.pricing.monthly}
          </div>
          <div className="mt-1 text-sm text-[var(--muted)]">
            {id === "yearly" ? t.pricing.billedYearly : t.pricing.billedMonthly}
          </div>
          <div className="mt-4 text-2xl font-semibold text-[var(--text)]">{fmtMoney(p.price, p.currency)}</div>
          <div className="mt-3 space-y-1 text-sm text-[var(--muted)]">
            <div>• {t.pricing.trialBadge}</div>
            <div>• {t.pricing.limitsNote}</div>
            <div>• {t.pricing.accessFeatures}</div>
            {id === "yearly" ? <div>• {t.pricing.yearlySave}</div> : null}
          </div>
        </button>
        <div className="mt-auto px-5 pb-5">{renderPaypal(id)}</div>
      </article>
    );
  });

  const planGrid = (
    <div className="mt-7 grid grid-cols-1 items-stretch gap-4 md:grid-cols-3">
      <article className={cardClass(selected === "free")}>
        <button type="button" onClick={() => selectPlan("free")} className="w-full p-5 text-left">
          <div className="text-lg font-semibold text-[var(--text)]">{t.pricing.free}</div>
          <div className="mt-1 text-sm text-[var(--muted)]">{t.pricing.billedFree}</div>
          <div className="mt-4 text-2xl font-semibold text-[var(--text)]">{fmtMoney("0", "USD")}</div>
          <div className="mt-3 space-y-1 text-sm text-[var(--muted)]">
            <div>• {t.pricing.freeNote}</div>
            <div>• {t.pricing.accessFeatures}</div>
          </div>
        </button>
        <div className="mt-auto px-5 pb-5">
          <button
            onClick={() => router.push(localePath("/app/dreams", locale))}
            className="dream-btn dream-btn--neutral w-full"
            type="button"
          >
            {t.upgrade.continueWithout}
          </button>
        </div>
      </article>
      {paidCards}
    </div>
  );

  return (
    <main className="relative mx-auto min-h-screen max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-2xl font-semibold text-[var(--text)] sm:text-3xl">{t.upgrade.title}</div>
          <div className="mt-1 text-sm text-[var(--muted)]">{t.pricing.trialBadge}</div>
        </div>
        <button
          onClick={() => router.push(localePath("/app/dreams", locale))}
          className="dream-btn dream-btn--neutral"
          type="button"
        >
          {t.upgrade.back}
        </button>
      </div>

      {uid && !paypalEnabled && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-600/15 px-4 py-4 text-sm text-red-200">
          {t.upgrade.paypalMissing}
        </div>
      )}

      {uid && error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-600/15 px-4 py-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {uid && status === "success" && (
        <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-600/15 px-4 py-4 text-sm text-green-200">
          {lastAction === "cancel" ? t.upgrade.cancelled : t.upgrade.success}
        </div>
      )}

      {paypalEnabled && mounted && uid ? (
        <PayPalScriptProvider options={scriptOptions}>{planGrid}</PayPalScriptProvider>
      ) : (
        planGrid
      )}

      {uid && subscribed && !isCancelled ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => void cancelSubscription()}
            disabled={busyCancel}
            className="dream-btn dream-btn--neutral disabled:opacity-60"
          >
            {busyCancel ? t.upgrade.cancelling : t.upgrade.cancelCta}
          </button>
        </div>
      ) : null}

      {uid && subscribed && isCancelled ? (
        <div className="mt-5 text-sm text-[var(--muted)]">
          {formatMessage(t.upgrade.accessUntil, { date: fmtDate(billing?.accessUntilMs) })}
        </div>
      ) : null}

      <div className="mt-5 space-y-2 text-xs text-[var(--muted)]">
        <p>{t.pricing.cancelAnytime}</p>
        <CheckoutLegalConsent />
      </div>
    </main>
  );
}
