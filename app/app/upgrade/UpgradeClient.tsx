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

function fmtMoney(price: string, currency: string) {
  const v = Number(price);
  if (!Number.isFinite(v)) return `${price} ${currency}`;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: String(currency || "USD").toUpperCase(),
    maximumFractionDigits: 2,
  }).format(v);
}

function toInitialPlan(initialPkg: string | null): PlanId {
  if (initialPkg === "yearly" || initialPkg === "year") return "yearly";
  return "monthly";
}

export default function UpgradeClient({ initialPkg }: { initialPkg: string | null }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useMessages();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [uid, setUid] = useState<string | null>(null);
  const [billing, setBilling] = useState<UserBillingFields | null>(null);
  const [selected, setSelected] = useState<PlanId>(() => toInitialPlan(initialPkg));
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

  const plan = SUBSCRIPTION_PLANS[selected];
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

  return (
    <main className="relative min-h-screen px-5 sm:px-6 py-8 sm:py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-2xl sm:text-3xl font-semibold text-[var(--text)]">{t.upgrade.title}</div>
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

      {!uid && (
        <div className="mt-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5">
          <div className="text-[var(--text)] font-semibold">{t.upgrade.notSignedIn}</div>
          <div className="mt-2 text-[var(--muted)] text-sm">{t.upgrade.signInFirst}</div>
          <button
            onClick={() => router.push(localePath("/signin?next=/app/upgrade", locale))}
            className="mt-4 dream-primary-btn"
            type="button"
          >
            {t.upgrade.goSignIn}
          </button>
        </div>
      )}

      {uid && !paypalEnabled && (
        <div className="mt-6 text-sm text-red-200 bg-red-600/15 border border-red-500/30 rounded-2xl px-4 py-4">
          {t.upgrade.paypalMissing}
        </div>
      )}

      {uid && error && (
        <div className="mt-6 text-sm text-red-200 bg-red-600/15 border border-red-500/30 rounded-2xl px-4 py-4">
          {error}
        </div>
      )}

      {uid && status === "success" && (
        <div className="mt-6 text-sm text-green-200 bg-green-600/15 border border-green-500/30 rounded-2xl px-4 py-4">
          {subscribed ? t.upgrade.success : t.upgrade.cancelled}
        </div>
      )}

      {uid && (
        <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(Object.keys(SUBSCRIPTION_PLANS) as PlanId[]).map((id) => {
            const p = SUBSCRIPTION_PLANS[id];
            const active = selected === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSelected(id);
                  setStatus("idle");
                  setError(null);
                  trackEvent("select_item", {
                    item_list_id: "subscription_plans",
                    item_list_name: "Subscription plans",
                    items: [subscriptionItem(id, p.price)],
                  });
                }}
                className={[
                  "text-left rounded-3xl border shadow-sm transition",
                  "bg-[var(--card)] border-[var(--border)]",
                  active ? "ring-2 ring-[color-mix(in_srgb,var(--text)_35%,transparent)]" : "hover:opacity-95",
                ].join(" ")}
              >
                <div className="p-5">
                  <div className="text-lg font-semibold text-[var(--text)]">
                    {id === "yearly" ? t.pricing.yearly : t.pricing.monthly}
                  </div>
                  <div className="mt-1 text-sm text-[var(--muted)]">
                    {id === "yearly" ? t.pricing.billedYearly : t.pricing.billedMonthly}
                  </div>
                  <div className="mt-4 text-2xl font-semibold text-[var(--text)]">
                    {fmtMoney(p.price, p.currency)}
                  </div>
                  <div className="mt-3 text-sm text-[var(--muted)] space-y-1">
                    <div>• {t.pricing.trialBadge}</div>
                    <div>• {t.pricing.limitsNote}</div>
                    {id === "yearly" ? <div>• {t.pricing.yearlySave}</div> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {uid && (
        <div className="mt-7 rounded-3xl bg-[var(--card)] border border-[var(--border)] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="text-lg font-semibold text-[var(--text)]">
                {selected === "yearly" ? t.pricing.yearly : t.pricing.monthly}
              </div>
              <div className="mt-1 text-sm text-[var(--muted)]">{fmtMoney(plan.price, plan.currency)}</div>
            </div>
            <button
              onClick={() => router.push(localePath("/app/dreams", locale))}
              className="dream-btn dream-btn--neutral"
              type="button"
            >
              {t.upgrade.continueWithout}
            </button>
          </div>

          <div className="mt-5">
            {subscribed ? (
              <button
                type="button"
                onClick={() => void cancelSubscription()}
                disabled={busyCancel || billing?.subscriptionStatus === "cancelled"}
                className="dream-btn dream-btn--neutral disabled:opacity-60"
              >
                {busyCancel ? t.upgrade.cancelling : t.upgrade.cancelCta}
              </button>
            ) : !paypalEnabled ? (
              <div className="text-sm text-[var(--muted)]">{t.upgrade.paypalMissing}</div>
            ) : !mounted ? (
              <div className="text-sm text-[var(--muted)]">{t.upgrade.creating}</div>
            ) : (
              <PayPalScriptProvider options={scriptOptions}>
                <div
                  className={`w-full max-w-[280px] ${
                    status === "paying" ? "opacity-70 pointer-events-none" : ""
                  }`}
                >
                  <PayPalButtons
                    style={{ layout: "vertical", label: "subscribe" }}
                    forceReRender={[selected]}
                    createSubscription={async () => {
                      setError(null);
                      setStatus("creating");
                      trackEvent("begin_checkout", {
                        currency: plan.currency,
                        value: Number(plan.price),
                        items: [subscriptionItem(selected, plan.price)],
                      });
                      try {
                        const idToken = await getIdTokenOrThrow();
                        const r = await fetch("/api/paypal/create-subscription", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ plan: selected, idToken }),
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
                          items: [subscriptionItem(selected, plan.price)],
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
                </div>
              </PayPalScriptProvider>
            )}

            {status === "creating" && <div className="mt-3 text-sm text-[var(--muted)]">{t.upgrade.creating}</div>}
            {status === "paying" && <div className="mt-3 text-sm text-[var(--muted)]">{t.upgrade.paying}</div>}
          </div>

          <div className="mt-4 space-y-2 text-xs text-[var(--muted)]">
            <p>{t.pricing.cancelAnytime}</p>
            <CheckoutLegalConsent />
          </div>
        </div>
      )}

      {!uid ? <CheckoutLegalConsent className="mt-6 text-xs text-[var(--muted)]" /> : null}
    </main>
  );
}
