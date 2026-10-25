import { NextResponse } from 'next/server';
import { requireCronSecret } from '@/app/api/admin/_lib/gsc';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Retired bulk endpoint: old schedulers cannot generate unrequested content. */
export async function GET(request: Request) {
  try {
    requireCronSecret(request);
    return NextResponse.json({ status: 'retired', worker: '/api/cron/horoscope-worker' }, { status: 410 });
  } catch (error) {
    return NextResponse.json({ error: 'UNAVAILABLE' }, { status: error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 503 });
  }
}
