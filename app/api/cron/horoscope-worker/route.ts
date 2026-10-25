import { NextResponse } from 'next/server';
import { requireCronSecret } from '@/app/api/admin/_lib/gsc';
import { drainRequestedJobs, expediteRetry, HoroscopeRequestError } from '@/lib/horoscope/jobs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
async function run(request: Request, manual: boolean) {
  try {
    requireCronSecret(request);
    if (manual) {
      const text = await request.text();
      if (text.length > 256) throw new HoroscopeRequestError(400, 'INVALID_REQUEST');
      const body = JSON.parse(text);
      if (!body || Object.keys(body).length !== 1 || typeof body.jobId !== 'string') throw new HoroscopeRequestError(400, 'INVALID_REQUEST');
      await expediteRetry(body.jobId);
    }
    const result = await drainRequestedJobs();
    console.info('[horoscope]', { event: 'worker_tick', ...result });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message === 'UNAUTHENTICATED' ? 401 : error instanceof HoroscopeRequestError ? error.status : message.includes('not configured') ? 503 : 500;
    if (status >= 500) console.error('[horoscope]', { event: 'worker_unavailable', status });
    return NextResponse.json({ error: 'HOROSCOPE_UNAVAILABLE' }, { status });
  }
}
export async function GET(request: Request) { return run(request, false); }
export async function POST(request: Request) { return run(request, true); }
