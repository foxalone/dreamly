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
 * Renders the site-wide paywall (see lib/paywall.ts): plans + "watch a short
 * ad" for one more interpretation / save / translation. The ad button is
 * offered only to signed-in users without a subscription who still have ad
 * rewards left today for that kind. GPT is requested after user opt-in.
 * Guest analysis limits use a separate sign-in / rewarded-ad choice.
 */
export default function PaywallHost() {
  const t = useMessages();
  const [req, setReq] = useState<PaywallRequest | null>(null);
  const [adAllowed, setAdAllowed] = useState(false);
  const requestVersion = useRef(0);
  const [version, setVersion] = useState(0);
  // Closing the paywall also drops a pending Offerwall resume (lib/adUnlock.ts);
  // RewardedAdButton navigates away before this runs when it falls back.
  const close = () => { requestVersion.current++; setReq(null); clearAdUnlockPending(); };

  useEffect(
    () =>
      subscribePaywall(async (next) => {
        const current = ++requestVersion.current;
        setVersion(current);
        setReq(next);
        setAdAllowed(false);
        const u = auth.currentUser;
        if (!u || next.guest) return;
        try {
          const snap = await getDoc(doc(firestore, "users", u.uid));
          const data = (snap.exists() ? snap.data() : {}) as UserBillingFields;
          if (current !== requestVersion.current || auth.currentUser?.uid !== u.uid) return;
          if (!hasPaidAccess(data) && adRewardsLeftFor(data, next.kind) > 0) setAdAllowed(true);
        } catch {
          /* no ad button */
        }
      }),
    []
  );

  if (!req) return null;

  if (req.guest) return <GuestAnalysisLimitModal key={version} request={req} onClose={close} />;

  const rewardUser = auth.currentUser;
  const pm = t.plansModal;
  const copy =
    req.kind === "save"
      ? { title: pm.savesLimitTitle, body: pm.savesLimitBody, ad: pm.watchAdSave }
      : req.kind === "translate"
        ? { title: pm.translateTitle, body: pm.translateBody, ad: pm.watchAdTranslate }
        : req.reason === "daily"
          ? { title: pm.saveDailyTitle, body: pm.saveDailyBody, ad: pm.watchAd }
          : { title: pm.saveTitle, body: pm.saveBody, ad: pm.watchAd };

  return (
    <PlansModal
      key={version}
      open
      onClose={close}
      source={req.source}
      title={copy.title}
      body={copy.body}
      rewarded={
        adAllowed
          ? {
              label: copy.ad,
              kind: req.kind,
              onGranted: async (rewardId) => {
                const u = auth.currentUser;
                if (!u || u.uid !== rewardUser?.uid) return false;
                const idToken = await u.getIdToken();
                const res = await fetch("/api/dreams/ad-reward", {
                  method: "POST",
                  keepalive: true,
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ idToken, kind: req.kind, rewardId }),
                });
                return res.ok;
              },
              onDone: () => {
                const retry = req.retry;
                close();
                retry?.();
              },
            }
          : null
      }
    />
  );
}
