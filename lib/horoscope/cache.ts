import type { Locale } from '@/lib/i18n/config';
import { completeLocales, referenceTime, type Readings } from './model';
import { ASPECTS, BODIES, zodiacAt, type Sky } from './astronomy';
import { isSign } from './model';
export function validSky(sky: Sky, day: string) {
  if (!sky || sky.day !== day || sky.referenceTime !== referenceTime(day).toISOString() || !Array.isArray(sky.planets) || sky.planets.length !== BODIES.length) return false;
  if (!BODIES.every(body => sky.planets.filter(p => p?.body === body).length === 1)) return false;
  if (!sky.planets.every(p => Number.isFinite(p.longitude) && p.longitude >= 0 && p.longitude < 360 && Number.isFinite(p.dailyMotion) && p.retrograde === (p.dailyMotion < 0) && p.sign === zodiacAt(p.longitude).sign && Math.abs(p.degree - zodiacAt(p.longitude).degree) < 1e-8)) return false;
  const moon = sky.moon;
  return !!moon && isSign(moon.sign) && Number.isFinite(moon.phase) && moon.phase >= 0 && moon.phase < 360 && Number.isInteger(moon.phaseIndex) && moon.phaseIndex >= 0 && moon.phaseIndex < 8 && Number.isFinite(moon.illuminated) && moon.illuminated >= 0 && moon.illuminated <= 1 && Array.isArray(sky.aspects) && sky.aspects.every(a => !!a && BODIES.includes(a.a) && BODIES.includes(a.b) && a.a !== a.b && a.name in ASPECTS && a.angle === ASPECTS[a.name] && Number.isFinite(a.orb) && a.orb >= 0 && a.orb <= 6);
}
export type Forecast = { day: string; publishedAt: string; sky: Sky; locales: Record<Locale, Readings>; complete: true; version: 1 };
export function validForecast(value: unknown): value is Forecast {
  if (!value || typeof value !== 'object') return false;
  const v = value as Forecast;
  try { referenceTime(v.day); } catch { return false; }
  return v.version === 1 && v.complete === true && Number.isFinite(Date.parse(v.publishedAt)) && validSky(v.sky, v.day) && !!v.locales && completeLocales(v.locales);
}
export function selectForecast(today: string, current: unknown): { forecast: Forecast | null; stale: boolean } {
  const forecast = validForecast(current) && current.day === today ? current : null;
  return { forecast, stale: false };
}

/** A page may publish one requested combination without requiring 72 readings. */
export type ForecastEdition = { day: string; publishedAt?: string; sky: Sky; locales: Partial<Record<Locale, Partial<Readings>>> };
