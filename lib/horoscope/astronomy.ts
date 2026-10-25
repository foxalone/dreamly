import { Body, Ecliptic, GeoVector, Illumination, MoonPhase } from 'astronomy-engine';
import { referenceTime, SIGNS } from './model';

export const BODIES = [Body.Sun, Body.Moon, Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn, Body.Uranus, Body.Neptune, Body.Pluto] as const;
export const ASPECTS = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 } as const;
export function normalize(degrees: number) { return ((degrees % 360) + 360) % 360; }
export function zodiacAt(longitude: number) {
  if (!Number.isFinite(longitude)) throw new Error('Invalid longitude');
  const angle = normalize(longitude);
  return { sign: SIGNS[Math.floor(angle / 30)], degree: angle % 30 };
}
export function signedMotion(before: number, after: number) { return normalize(after - before + 180) - 180; }
export function aspectBetween(a: number, b: number) {
  const separation = Math.abs(signedMotion(a,b));
  for (const [name, angle] of Object.entries(ASPECTS)) {
    const orb = Math.abs(separation - angle);
    if (orb <= 6) return { name: name as keyof typeof ASPECTS, angle, orb };
  }
  return null;
}
// GeoVector returns light-time corrected EQJ coordinates. Ecliptic rotates those
// to the true ecliptic/equinox of date. EclipticLongitude is HELIOCENTRIC: do not use it here.
const longitudeAt = (body: Body, at: Date) => normalize(Ecliptic(GeoVector(body, at, true)).elon);
export function calculateSky(day: string) {
  const at = referenceTime(day);
  const before = new Date(+at - 12 * 3600000), after = new Date(+at + 12 * 3600000);
  const planets = BODIES.map(body => {
    const longitude = longitudeAt(body, at);
    const motion = signedMotion(longitudeAt(body, before), longitudeAt(body, after));
    return { body, longitude, ...zodiacAt(longitude), dailyMotion: motion, retrograde: motion < 0 };
  });
  const aspects = planets.flatMap((a,i) => planets.slice(i+1).flatMap(b => {
    const aspect = aspectBetween(a.longitude,b.longitude);
    return aspect ? [{ a: a.body, b: b.body, ...aspect }] : [];
  })).sort((a,b) => a.orb-b.orb);
  const phase = MoonPhase(at);
  return { day, referenceTime: at.toISOString(), planets, aspects, moon: {
    phase, phaseIndex: Math.floor(normalize(phase + 22.5) / 45), illuminated: Illumination(Body.Moon, at).phase_fraction,
    sign: planets.find(p => p.body === Body.Moon)!.sign
  }};
}
export type Sky = ReturnType<typeof calculateSky>;
