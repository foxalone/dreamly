// Dream length: 350 words (char cap is only a safety net) — see lib/dreamLength.ts
export { DREAM_MAX_CHARS, DREAM_MAX_WORDS } from "@/lib/dreamLength";
// Subscribers: AI analyses per UTC day (decided 2026-10-04).
export const DREAMS_PER_DAY = 3;
export const TRIAL_DAYS = 3;
// Non-subscribers get this many feed translations per UTC day (cached or not —
// the shared cache only saves the OpenAI call). A dream+lang a user already
// paid for stays free for that user forever. See app/api/dreams/_lib/translationLedger.ts.
export const FREE_TRANSLATIONS_PER_DAY = 1;
// Saving to the diary is free and unlimited for every signed-in user
// (decided 2026-10-04 — it costs nothing). SAVES_PER_DAY_ABUSE_CAP is only a
// quiet anti-bot backstop. AI analyses are what is limited: guests get
// GUEST_FREE_ASKS (1), signed-in users without a subscription get
// FREE_ANALYSES_TOTAL in total and at most FREE_ANALYSES_PER_DAY per UTC day
// (users/{uid}.freeAnalyses*, server-only in firestore.rules), subscribers
// DREAMS_PER_DAY. The user is never shown how many free analyses are left.
export const SAVES_PER_DAY_ABUSE_CAP = 50;
// Without a subscription: FREE_SAVES_PER_IP_PER_DAY diary saves per network
// (hashed IP) per UTC day; after that each save needs a rewarded ad, at most
// AD_SAVE_REWARDS_PER_DAY ads per user per day (decided 2026-10-04).
export const FREE_SAVES_PER_IP_PER_DAY = 5;
export const AD_SAVE_REWARDS_PER_DAY = 10;
export const FREE_ANALYSES_TOTAL = 5;
export const FREE_ANALYSES_PER_DAY = 1;
// Rewarded ad (Google Ad Manager): a signed-in user without a subscription
// who hit the free limit may watch an ad for one more AI analysis, at most
// AD_REWARDS_PER_DAY times per UTC day. The "granted" signal comes from the
// browser and cannot be verified, so this server-side cap is the guard.
export const AD_REWARDS_PER_DAY = 3;
export const REWARDED_AD_UNIT_PATH = "/23382781832/dreamly_rewarded";

export const SUBSCRIPTION_PLANS = {
  monthly: {
    id: "monthly",
    price: "6.99",
    currency: "USD",
    intervalUnit: "MONTH" as const,
    intervalCount: 1,
    name: "Dreamly Monthly",
  },
  yearly: {
    id: "yearly",
    price: "69.99",
    currency: "USD",
    intervalUnit: "YEAR" as const,
    intervalCount: 1,
    name: "Dreamly Yearly",
  },
} as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;

export function isPlanId(v: unknown): v is PlanId {
  return v === "monthly" || v === "yearly";
}
