import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireCronSecret } from '@/app/api/admin/_lib/gsc';
import { generateDailyHoroscope } from '@/lib/horoscope/generate';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export async function GET(request: Request) {
  try {
    requireCronSecret(request);
    const result = await generateDailyHoroscope();
    if (result.status === 'published') revalidateTag('horoscope', { expire: 0 });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status = message === 'UNAUTHENTICATED' ? 401 : message.includes('not configured') ? 503 : 500;
    if (status === 500) console.error('[cron/horoscope]', error instanceof Error ? error.name : 'Error');
    return NextResponse.json({ error: status === 401 ? 'UNAUTHENTICATED' : 'HOROSCOPE_UNAVAILABLE' }, { status });
  }
}
