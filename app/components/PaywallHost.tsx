"use client";

import { useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import { auth, firestore } from "@/lib/firebase";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import { clearAdUnlockPending } from "@/lib/adUnlock";
import { subscribePaywall, type PaywallRequest } from "@/lib/paywall";
import { adRewardsLeftFor, hasPaidAccess, type UserBillingFields } from "@/lib/subscriptions/status";
import GuestAnalysisLimitModal from "./GuestAnalysisLimitModal";
import PlansModal from "./PlansModal";

/**
 * Shows the blocked action's choices: the subscription plans and, while the
 * user is still eligible for one today, a "watch a short ad" card. Picking
 * the ad navigates to the AdSense Offerwall page (/ad/unlock), which shows
 * the ad, books the reward and returns; the caller resumes the pending
 * action from sessionStorage (lib/adUnlock.ts).
 */
export default function PaywallHost() {
  const t = useMessages();
  const [req, setReq] = useState<PaywallRequest | null>(null);
  const [checking, setChecking] = useState(false);
  const [adEligible, setAdEligible] = useState(false);
  const requestVersion = useRef(0);
  const [version, setVersion] = useState(0);
  // Dismissing the pricing option drops a pending Offerwall resume.
  const close = () => { requestVersion.current++; setReq(null); clearAdUnlockPending(); };

  useEffect(
    () =>
      subscribePaywall(async (next) => {
        const current = ++requestVersion.current;
        setVersion(current);
        setReq(next);
        setAdEligible(false);
        setChecking(!next.guest);
        const u = auth.currentUser;
        if (!u || next.guest) { setChecking(false); return; }
        try {
          const snap = await getDoc(doc(firestore, "users", u.uid));
          const data = (snap.exists() ? snap.data() : {}) as UserBillingFields;
          if (current !== requestVersion.current || auth.currentUser?.uid !== u.uid) return;
          setAdEligible(!hasPaidAccess(data) && adRewardsLeftFor(data, next.kind) > 0);
        } catch {
          /* Keep the subscription option available if eligibility cannot be read. */
        }
        if (current === requestVersion.current) setChecking(false);
      }),
    []
  );

  if (!req) return null;

  if (req.guest) return <GuestAnalysisLimitModal key={version} request={req} onClose={close} />;
  if (checking) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="status">
      <div className="w-full max-w-xs rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--text)]/60" />
        </div>
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
  const adLabel =
    req.kind === "translate" ? pm.watchAdTranslate : req.kind === "save" ? pm.watchAdSave : pm.watchAd;

  return (
    <PlansModal
      key={version}
      open
      onClose={close}
      source={req.source}
      title={copy.title}
      body={copy.body}
      rewarded={adEligible ? { label: adLabel, kind: req.kind, translation: req.translation } : null}
    />
  );
}
