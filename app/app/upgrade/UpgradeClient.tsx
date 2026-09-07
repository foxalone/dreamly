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

  const subscribed = hasPaidAccess(billing);
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
                throw new Error(String(j?.error ?? t.upgrade.creating));
              }
              setStatus("idle");
              return subscriptionID;
            } catch (e: unknown) {
              setStatus("error");
              setError(e instanceof Error ? e.message : t.upgrade.creating);
              return "";
            }
          }}
          onApprove={async (data) => {
            try {
              setStatus("paying");
              const subscriptionID = String(data?.subscriptionID ?? "").trim();
              if (!subscriptionID) throw new Error("Missing subscriptionID from PayPal.");
              const idToken = await getIdTokenOrThrow();
              const r = await fetch("/api/paypal/activate-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscriptionID, idToken }),
              });
              const j = await r.json().catch(() => ({} as Record<string, unknown>));
              if (!r.ok || !j?.ok) throw new Error(String(j?.error ?? t.upgrade.paying));
              trackEvent("purchase", {
                transaction_id: subscriptionID,
                currency: plan.currency,
                value: Number(plan.price),
                items: [subscriptionItem(planId, plan.price)],
              });
              setStatus("success");
            } catch (e: unknown) {
              setStatus("error");
              setError(e instanceof Error ? e.message : t.upgrade.paying);
            }
          }}
          onCancel={() => setStatus("idle")}
          onError={(err) => {
            console.error("PayPal error:", err);
            setStatus("error");
            setError("PayPal error. Please try again.");
          }}
        />
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
          {subscribed ? t.upgrade.success : t.upgrade.cancelled}
        </div>
      )}

      {paypalEnabled && mounted && uid ? (
        <PayPalScriptProvider options={scriptOptions}>{planGrid}</PayPalScriptProvider>
      ) : (
        planGrid
      )}

      {uid && subscribed ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => void cancelSubscription()}
            disabled={busyCancel || billing?.subscriptionStatus === "cancelled"}
            className="dream-btn dream-btn--neutral disabled:opacity-60"
          >
            {busyCancel ? t.upgrade.cancelling : t.upgrade.cancelCta}
          </button>
        </div>
      ) : null}

      <div className="mt-5 space-y-2 text-xs text-[var(--muted)]">
        <p>{t.pricing.cancelAnytime}</p>
        <CheckoutLegalConsent />
      </div>
    </main>
  );
}
