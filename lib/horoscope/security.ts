import { createHmac } from 'node:crypto';
import { HoroscopeRequestError } from './jobs';

export function publicRequestBucket(request: Request, env: Record<string, string | undefined> = process.env) {
  const origin = request.headers.get('origin');
  const target = new URL(request.url);
  // Next dev can normalize request.url to localhost even when the browser
  // accesses 127.0.0.1. Host is the actual HTTP authority seen by the browser.
  const host = request.headers.get('host') ?? target.host;
  if (!/^[a-z0-9.\-:\[\]]+$/i.test(host)) throw new HoroscopeRequestError(403, 'FORBIDDEN');
  const expectedOrigin = new URL(`${target.protocol}//${host}`).origin;
  if (origin !== expectedOrigin || request.headers.get('x-horoscope-request') !== '1' || request.headers.get('sec-fetch-site') === 'cross-site') throw new HoroscopeRequestError(403, 'FORBIDDEN');
  const secret = env.CRON_SECRET?.trim();
  if (!secret) throw new HoroscopeRequestError(503, 'UNAVAILABLE');
  // Vercel sets this trusted forwarding header. On local/self-hosted installs
  // use one shared bucket rather than trusting a spoofable client header.
  const network = env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'local';
  return createHmac('sha256', secret).update(network).digest('hex').slice(0, 32);
}
