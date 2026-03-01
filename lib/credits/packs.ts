//app/src/lib/credits/packs.ts
export const CREDIT_PACKS: Record<
  string,
  { credits: number; price: string; currency: string }
> = {
  pack_20: { credits: 20, price: "3.99", currency: "USD" },
  pack_50: { credits: 50, price: "7.99", currency: "USD" },
  pack_120: { credits: 120, price: "14.99", currency: "USD" },
  pack_300: { credits: 300, price: "29.99", currency: "USD" },
};