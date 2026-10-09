"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { SUBSCRIPTION_PLANS, type PlanId } from "@/lib/subscriptions/plans";
import { subscriptionItem, trackEvent } from "@/lib/analytics";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/path";
import type { PaywallKind } from "@/lib/paywall";
import RewardedAdButton from "./RewardedAdButton";

type Props = {
  open: boolean;
  onClose: () => void;
  /** GA4 `upgrade_prompt` source, e.g. "feed_translate". */
  source: string;
  title: string;
  body: string;
  /**
   * The ad is a choice alongside the paid plans. Try the direct rewarded slot
   * first, then fall back to the AdSense Offerwall when it has no fill.
   */
  rewarded?: {
    label: string;
    kind: PaywallKind;
    translation?: { sharedDreamId: string; targetLang: string };
    onGranted: (rewardId: string) => Promise<boolean>;
    onDone: () => void;
  } | null;
};

function fmtMoney(price: string, currency: string) {
  const v = Number(price);
  if (!Number.isFinite(v)) return `${price} ${currency}`;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: String(currency || "USD").toUpperCase(),
    maximumFractionDigits: 2,
  }).format(v);
}

/**
 * Lightweight "pick a plan" dialog shown when a paywalled action is hit
 * (e.g. the second translation of the day). Picking a plan sends the user
 * to /app/upgrade?pkg=<plan>, where the PayPal checkout lives.
 */
export default function PlansModal({ open, onClose, source, title, body, rewarded }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const t = useMessages();

  // Keep the latest onClose without re-running the effect (parents usually
  // pass an inline arrow, which would otherwise re-fire the analytics event
  // on every render).
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    trackEvent("upgrade_prompt", { source });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, source]);

  if (!open) return null;

  function choose(id: PlanId) {
    const p = SUBSCRIPTION_PLANS[id];
    trackEvent("select_item", {
      item_list_id: "subscription_plans",
      item_list_name: "Subscription plans",
      items: [subscriptionItem(id, p.price)],
    });
    onClose();
    router.push(localePath(`/app/upgrade?pkg=${id}`, locale));
  }

  const plans = (Object.keys(SUBSCRIPTION_PLANS) as PlanId[]).map((id) => {
    const p = SUBSCRIPTION_PLANS[id];
    const yearly = id === "yearly";
    return (
      <button
        key={id}
        type="button"
        onClick={() => choose(id)}
        className={[
          "flex flex-col rounded-2xl border p-4 text-start transition",
          "border-[var(--border)] bg-[var(--card)] hover:border-violet-400/60 hover:bg-violet-500/10",
        ].join(" ")}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-base font-semibold text-[var(--text)]">
            {yearly ? t.pricing.yearly : t.pricing.monthly}
          </span>
          <span className="text-lg font-semibold text-[var(--text)]">{fmtMoney(p.price, p.currency)}</span>
        </div>
        <div className="mt-1 text-xs text-[var(--muted)]">
          {yearly ? t.pricing.billedYearly : t.pricing.billedMonthly}
          {yearly ? ` · ${t.pricing.yearlySave}` : ""}
        </div>
        <div className="mt-2 text-xs text-[var(--muted)]">{t.pricing.trialBadge}</div>
        <span className="dream-primary-btn mt-4 w-full text-center text-sm">{t.plansModal.subscribeCta}</span>
      </button>
    );
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plans-modal-title"
    >
      <div
        className="max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="plans-modal-title" className="text-lg font-semibold text-[var(--text)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.plansModal.notNow}
            className="rounded-full px-2 text-lg leading-none text-[var(--muted)] hover:text-[var(--text)]"
          >
            ×
          </button>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">{body}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">{t.plansModal.unlimitedNote}</p>
        <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {rewarded ? t.plansModal.chooseAccess : t.plansModal.choosePlan}
        </div>
        <div className={`mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 ${rewarded ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {plans}
          {rewarded ? (
            <RewardedAdButton
              label={t.plansModal.adCardCta}
              kind={rewarded.kind}
              translation={rewarded.translation}
              source={source}
              statusCopy={{ loading: t.plansModal.adLoading, unavailable: t.plansModal.adUnavailableSignedIn, failed: t.plansModal.adFailed }}
              onGranted={rewarded.onGranted}
              onDone={rewarded.onDone}
              card={{ title: t.plansModal.adCardTitle, price: t.pricing.free, description: rewarded.label }}
            />
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-[var(--muted)]">{t.pricing.cancelAnytime}</span>
          <button type="button" onClick={onClose} className="dream-btn dream-btn--neutral text-sm">
            {t.plansModal.notNow}
          </button>
        </div>
      </div>
    </div>
  );
}
