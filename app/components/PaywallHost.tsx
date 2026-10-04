"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import { auth, firestore } from "@/lib/firebase";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import { subscribePaywall, type PaywallRequest } from "@/lib/paywall";
import { adRewardsLeftFor, hasPaidAccess, type UserBillingFields } from "@/lib/subscriptions/status";
import PlansModal from "./PlansModal";

/**
 * Renders the site-wide paywall (see lib/paywall.ts): plans + "watch a short
 * ad" for one more interpretation / save / translation. The ad button is
 * offered only to signed-in users without a subscription who still have ad
 * rewards left today for that kind — and only when Google has an ad.
 */
export default function PaywallHost() {
  const t = useMessages();
  const [req, setReq] = useState<PaywallRequest | null>(null);
  const [adAllowed, setAdAllowed] = useState(false);

  useEffect(
    () =>
      subscribePaywall(async (next) => {
        setReq(next);
        setAdAllowed(false);
        const u = auth.currentUser;
        if (!u) return;
        try {
          const snap = await getDoc(doc(firestore, "users", u.uid));
          const data = (snap.exists() ? snap.data() : {}) as UserBillingFields;
          if (!hasPaidAccess(data) && adRewardsLeftFor(data, next.kind) > 0) setAdAllowed(true);
        } catch {
          /* no ad button */
        }
      }),
    []
  );

  if (!req) return null;

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
      open
      onClose={() => setReq(null)}
      source={req.source}
      title={copy.title}
      body={copy.body}
      rewarded={
        adAllowed
          ? {
              label: copy.ad,
              onGranted: async () => {
                const u = auth.currentUser;
                if (!u) return false;
                const idToken = await u.getIdToken();
                const res = await fetch("/api/dreams/ad-reward", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ idToken, kind: req.kind }),
                });
                return res.ok;
              },
              onDone: () => {
                const retry = req.retry;
                setReq(null);
                retry?.();
              },
            }
          : null
      }
    />
  );
}
