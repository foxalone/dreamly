"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { SUBSCRIPTION_PLANS, type PlanId } from "@/lib/subscriptions/plans";
import { subscriptionItem, trackEvent } from "@/lib/analytics";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/path";

type Props = {
  open: boolean;
  onClose: () => void;
  /** GA4 `upgrade_prompt` source, e.g. "feed_translate". */
  source: string;
  title: string;
  body: string;
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
export default function PlansModal({ open, onClose, source, title, body }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const t = useMessages();

  // Keep the latest onClose without re-running the effect (parents usually
  // pass an inline arrow, which would otherwise re-fire the analytics event
  // on every render).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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
          "flex flex-col rounded-2xl border p-4 text-left transition",
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
        className="max-h-[min(90dvh,40rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl"
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

        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t.plansModal.choosePlan}
        </div>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">{plans}</div>

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
