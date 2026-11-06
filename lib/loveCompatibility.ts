import type { Sign } from "@/lib/horoscope/model";

export const LOVE_DIMENSIONS = ["emotional", "communication", "romance", "trust", "longTerm", "values"] as const;
export type LoveDimension = (typeof LOVE_DIMENSIONS)[number];

export function parseBirthDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

export function zodiacSign(value: string): Sign | null {
  const date = parseBirthDate(value);
  if (!date) return null;
  const day = (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
  if (day >= 1222 || day <= 119) return "capricorn";
  if (day <= 218) return "aquarius";
  if (day <= 320) return "pisces";
  if (day <= 419) return "aries";
  if (day <= 520) return "taurus";
  if (day <= 620) return "gemini";
  if (day <= 722) return "cancer";
  if (day <= 822) return "leo";
  if (day <= 922) return "virgo";
  if (day <= 1022) return "libra";
  if (day <= 1121) return "scorpio";
  return "sagittarius";
}

export function lifePath(value: string): number | null {
  if (!parseBirthDate(value)) return null;
  let sum = [...value.replaceAll("-", "")].reduce((total, digit) => total + Number(digit), 0);
  while (sum > 9) sum = [...String(sum)].reduce((total, digit) => total + Number(digit), 0);
  return sum;
}
