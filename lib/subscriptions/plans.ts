// Dream length: 350 words (char cap is only a safety net) — see lib/dreamLength.ts
export { DREAM_MAX_CHARS, DREAM_MAX_WORDS } from "@/lib/dreamLength";
export const DREAMS_PER_DAY = 5;
export const TRIAL_DAYS = 3;
// Non-subscribers get this many feed translations per UTC day (cached or not —
// the shared cache only saves the OpenAI call). A dream+lang a user already
// paid for stays free for that user forever. See app/api/dreams/_lib/translationLedger.ts.
export const FREE_TRANSLATIONS_PER_DAY = 1;
// A signed-in user without a subscription may save this many diary dreams
// in total, and at most FREE_DREAM_SAVES_PER_DAY of them per UTC day.
// Counted in users/{uid}.freeDreamSavesUsed / freeDreamSaveDayKey by
// consumeDreamSlot({ allowFreeSave: true }); both fields are server-only in
// firestore.rules. The user is never shown how many free saves are left —
// the plans modal only appears when a save is refused. AI interpretation is
// never covered by this — it stays subscription-only.
export const FREE_DREAM_SAVES_TOTAL = 5;
export const FREE_DREAM_SAVES_PER_DAY = 1;

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
