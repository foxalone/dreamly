export const DREAM_MAX_CHARS = 400;
export const DREAMS_PER_DAY = 5;
export const TRIAL_DAYS = 3;
// Non-subscribers get this many fresh (non-cached) translations per UTC day.
// Cached translations on shared dreams stay free for everyone, forever.
export const FREE_TRANSLATIONS_PER_DAY = 1;

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
