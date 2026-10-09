"use client";

import { useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import { auth, firestore } from "@/lib/firebase";
import { trackEvent } from "@/lib/analytics";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import { adUnlockUrl, clearAdUnlockPending } from "@/lib/adUnlock";
import { subscribePaywall, type PaywallRequest } from "@/lib/paywall";
import { adRewardsLeftFor, hasPaidAccess, type UserBillingFields } from "@/lib/subscriptions/status";
import GuestAnalysisLimitModal from "./GuestAnalysisLimitModal";
import PlansModal from "./PlansModal";

/**
 * Routes an eligible blocked action straight to the AdSense Offerwall, where
 * Google's "View a short ad" choice is the first click. When the user is not
 * eligible for another ad, show the subscription plans instead.
 */
export default function PaywallHost() {
  const t = useMessages();
  const [req, setReq] = useState<PaywallRequest | null>(null);
  const [checking, setChecking] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const requestVersion = useRef(0);
  const [version, setVersion] = useState(0);
  // Dismissing the pricing option drops a pending Offerwall resume. Automatic
  // navigation to an eligible ad leaves the selected action available.
  const close = () => { requestVersion.current++; setReq(null); clearAdUnlockPending(); };

  useEffect(
    () =>
      subscribePaywall(async (next) => {
        const current = ++requestVersion.current;
        setVersion(current);
        setReq(next);
        setChecking(!next.guest);
        setRedirecting(false);
        const u = auth.currentUser;
        if (!u || next.guest) { setChecking(false); return; }
        try {
          const snap = await getDoc(doc(firestore, "users", u.uid));
          const data = (snap.exists() ? snap.data() : {}) as UserBillingFields;
          if (current !== requestVersion.current || auth.currentUser?.uid !== u.uid) return;
          if (!hasPaidAccess(data) && adRewardsLeftFor(data, next.kind) > 0) {
            setRedirecting(true);
            trackEvent("rewarded_ad_open", { source: next.source, kind: next.kind });
            window.location.assign(adUnlockUrl(next.kind, undefined, next.translation));
            return;
          }
        } catch {
          /* Keep the subscription option available if eligibility cannot be read. */
        }
        if (current === requestVersion.current) setChecking(false);
      }),
    []
  );

  if (!req) return null;

  if (req.guest) return <GuestAnalysisLimitModal key={version} request={req} onClose={close} />;
  if (checking || redirecting) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="status">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--muted)]">
        {t.plansModal.adLoading}
      </div>
    </div>
  );

  const pm = t.plansModal;
  const copy =
    req.kind === "save"
      ? { title: pm.savesLimitTitle, body: pm.savesLimitBody }
      : req.kind === "translate"
        ? { title: pm.translateTitle, body: pm.translateBody }
        : req.reason === "daily"
          ? { title: pm.saveDailyTitle, body: pm.saveDailyBody }
          : { title: pm.saveTitle, body: pm.saveBody };

  return (
    <PlansModal
      key={version}
      open
      onClose={close}
      source={req.source}
      title={copy.title}
      body={copy.body}
    />
  );
}
