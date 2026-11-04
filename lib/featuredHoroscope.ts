import { createHash } from "node:crypto";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { SIGNS, isSign, type Sign } from "@/lib/horoscope/model";
import sample from "@/lib/featured-horoscope-sample.json";

export type FeaturedForecast = {
  day: string;
  sign: Sign;
  headline: string;
  teaser: string;
  opening: string;
  relationships: string;
  work: string;
  wellbeing: string;
  takeaway: string;
  publishedAtMs: number;
  model: string;
};

/** The new calendar day begins first at UTC+14 (Kiritimati). */
export function earliestWorldDay(now = Date.now()) {
  return new Date(now + 14 * 3_600_000).toISOString().slice(0, 10);
}

/** ISO week keyed by its Monday, using the featured article's calendar day. */
export function weekKey(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Invalid day");
  const date = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== day) throw new Error("Invalid day");
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

export function featuredId(day: string) {
  weekKey(day);
  return day;
}

export function validateFeatured(value: unknown): FeaturedForecast {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid forecast");
  const data = value as Record<string, unknown>;
  featuredId(String(data.day ?? ""));
  if (!isSign(data.sign)) throw new Error("Invalid sign");
  for (const key of ["headline", "teaser", "opening", "relationships", "work", "wellbeing", "takeaway", "model"] as const) {
    if (typeof data[key] !== "string" || !data[key].trim()) throw new Error(`Invalid ${key}`);
  }
  if (String(data.headline).length > 120 || String(data.teaser).length > 360) throw new Error("Forecast copy too long");
  if (!Number.isFinite(Number(data.publishedAtMs))) throw new Error("Invalid publish time");
  return data as FeaturedForecast;
}

export function publicFeatured(item: FeaturedForecast) {
  const { day, sign, headline, teaser, publishedAtMs } = item;
  return { day, sign, headline, teaser, publishedAtMs };
}

export function featuredSubject(actor: { uid: string } | { guestId: string }) {
  const value = "uid" in actor ? `user:${actor.uid}` : `guest:${actor.guestId}`;
  return createHash("sha256").update(value).digest("hex");
}

export async function readFeatured(day: string): Promise<FeaturedForecast | null> {
  featuredId(day);
  try {
    const snap = await adminFirestore().collection("featured_horoscopes").doc(day).get();
    if (snap.exists) return validateFeatured(snap.data());
  } catch (error) {
    if (day !== sample.day) throw error;
    console.error("featured horoscope sample fallback", error);
  }
  return day === sample.day ? validateFeatured(sample) : null;
}

export async function latestFeatured(): Promise<FeaturedForecast | null> {
  const today = earliestWorldDay();
  try {
    const snap = await adminFirestore().collection("featured_horoscopes").doc(today).get();
    if (snap.exists) return validateFeatured(snap.data());
  } catch (error) { console.error("featured horoscope latest read", error); }
  return sample.day === today ? validateFeatured(sample) : null;
}

export function randomFeaturedSign(random = Math.random): Sign {
  return SIGNS[Math.floor(random() * SIGNS.length) % SIGNS.length];
}
