// Dream length: 350 words (char cap is only a safety net) — see lib/dreamLength.ts
export { DREAM_MAX_CHARS, DREAM_MAX_WORDS } from "@/lib/dreamLength";
// Subscribers: saves + homepage-Ask analyses per UTC day (decided 2026-10-04).
export const DREAMS_PER_DAY = 3;
export const TRIAL_DAYS = 3;
// Non-subscribers get this many feed translations per UTC day (cached or not —
// the shared cache only saves the OpenAI call). A dream+lang a user already
// paid for stays free for that user forever. See app/api/dreams/_lib/translationLedger.ts.
export const FREE_TRANSLATIONS_PER_DAY = 1;
// A signed-in user without a subscription gets this many free dreams in
// total, at most FREE_DREAM_SAVES_PER_DAY per UTC day — for diary saves and,
// counted separately, for AI analyses (users/{uid}.freeDreamSaves* and
// freeAnalyses*, server-only in firestore.rules; see consumeDreamSlot and
// consumeAnalysisAccess). The user is never shown how many free dreams are
// left — the plans modal only appears when one is refused. Guests get
// GUEST_FREE_ASKS (1) analysis, then must sign in.
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
