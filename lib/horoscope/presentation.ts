import type { Sign } from './model';

// Intentionally stylized constellation asterisms, in a fixed illustration frame.
// These are decorative identities, not RA/Dec maps or tropical sign boundaries.
type Pattern = { points: [number, number][]; paths: number[][] };
export const CONSTELLATIONS: Record<Sign, Pattern> = {
  aries: { points:[[52,111],[112,94],[167,102],[182,127]], paths:[[0,1,2,3]] },
  taurus: { points:[[35,48],[87,111],[120,137],[151,108],[199,49],[115,86]], paths:[[0,1,2,3,4],[1,5,3]] },
  gemini: { points:[[73,43],[163,47],[87,88],[153,91],[68,145],[105,177],[155,142],[184,174]], paths:[[0,2,4],[2,5],[1,3,6,7],[2,3]] },
  cancer: { points:[[110,92],[61,45],[157,42],[106,141],[61,185],[163,177]], paths:[[1,0,2],[0,3,4],[3,5]] },
  leo: { points:[[174,49],[137,36],[105,67],[112,103],[155,118],[64,140],[40,181],[145,175]], paths:[[0,1,2,3,4],[3,5,6,7,4],[5,7]] },
  virgo: { points:[[37,68],[85,89],[133,73],[183,42],[131,119],[185,148],[96,169],[43,184]], paths:[[0,1,2,3],[2,4,5],[1,6,7],[4,6]] },
  libra: { points:[[117,45],[55,103],[166,100],[131,156],[190,181],[74,185]], paths:[[0,1,2,0],[1,3,2],[2,4],[3,5]] },
  scorpio: { points:[[47,43],[69,71],[39,88],[96,99],[121,127],[127,168],[157,190],[191,177],[199,147]], paths:[[0,1,2],[1,3,4,5,6,7,8]] },
  sagittarius: { points:[[63,108],[89,70],[133,58],[158,98],[144,144],[85,151],[47,145],[193,101],[191,145]], paths:[[0,1,2,3,4,5,0],[0,6,5],[3,7,8,4],[1,3]] },
  capricorn: { points:[[36,70],[101,91],[194,60],[167,134],[121,182],[68,148]], paths:[[0,1,2,3,4,5,0],[1,4]] },
  aquarius: { points:[[41,65],[85,87],[118,69],[149,95],[186,78],[147,133],[116,165],[143,193],[182,165]], paths:[[0,1,2,3,4],[3,5,6,7],[5,8]] },
  pisces: { points:[[39,57],[67,43],[86,66],[63,88],[149,153],[177,134],[202,156],[179,181]], paths:[[0,1,2,3,0],[3,4],[4,5,6,7,4]] },
};

/** Orthographic spherical terminator. Lit area equals illuminated fraction.
 * North-up convention: waxing lit on right, waning on left; not local horizon orientation.
 */
export function moonShape(phase: number, illuminated: number, radius = 80) {
  if (![phase, illuminated, radius].every(Number.isFinite) || radius <= 0) throw new Error('Invalid lunar geometry');
  const fraction = Math.max(0, Math.min(1, illuminated));
  const x = radius * (1 - 2 * fraction);
  const normalized = ((phase % 360) + 360) % 360;
  const path = fraction === 0 ? '' : `M 0 ${-radius} A ${radius} ${radius} 0 0 1 0 ${radius} ${Math.abs(x) < 1e-8 ? `L 0 ${-radius}` : `A ${Math.abs(x)} ${radius} 0 0 ${x < 0 ? 1 : 0} 0 ${-radius}`} Z`;
  return { path, mirror: normalized >= 180, fraction, terminatorX: x };
}
