export const DREAM_MAX_CHARS = 400;
export const DREAMS_PER_DAY = 5;
export const TRIAL_DAYS = 3;
// Non-subscribers get this many feed translations per UTC day (cached or not —
// the shared cache only saves the OpenAI call). A dream+lang a user already
// paid for stays free for that user forever. See app/api/dreams/_lib/translationLedger.ts.
export const FREE_TRANSLATIONS_PER_DAY = 1;
// A signed-in user without a subscription may save this many diary dreams,
// ever (not per day). Counted in users/{uid}.freeDreamSavesUsed by
// consumeDreamSlot({ allowFreeSave: true }); the field is server-only in
// firestore.rules. AI interpretation is never covered by this — it stays
// subscription-only.
export const FREE_DREAM_SAVES_TOTAL = 1;

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
