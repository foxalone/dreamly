import { after, NextResponse } from 'next/server';
import { requestReading, getReadingStatus, processRequested, validateRequest, HoroscopeRequestError } from '@/lib/horoscope/jobs';
import { requestHasHoroscopeAccess } from '@/lib/horoscope/access-cookie';
import { publicRequestBucket } from '@/lib/horoscope/security';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 240;
const headers = { 'Cache-Control': 'no-store' };
export async function POST(request: Request) {
  try {
    const bucket = publicRequestBucket(request);
    if (Number(request.headers.get('content-length') ?? 0) > 512) throw new HoroscopeRequestError(400, 'INVALID_REQUEST');
    const text = await request.text();
    if (text.length > 512) throw new HoroscopeRequestError(400, 'INVALID_REQUEST');
    const { sign, locale } = validateRequest(JSON.parse(text));
    if (!requestHasHoroscopeAccess(request, sign)) return NextResponse.json({error:'ACCESS_REQUIRED'},{status:402,headers});
    const result = await requestReading(sign, locale, bucket);
    if (result.status === 'queued' || result.status === 'processing' || result.status === 'retrying') {
      // Supported lifecycle hook, awaited by Next/Vercel after the response.
      // Firestore is the durable queue; the authenticated worker recovers crashes.
      after(async () => {
        try { await processRequested(result.day, sign, locale); }
        catch { console.error('[horoscope]', { event: 'background_storage_failure', day: result.day, sign, locale }); }
      });
    }
    return NextResponse.json(result, { headers });
  } catch (error) {
    const status = error instanceof HoroscopeRequestError ? error.status : error instanceof SyntaxError ? 400 : 503;
    return NextResponse.json({ error: status === 429 ? 'RATE_LIMITED' : status === 400 ? 'INVALID_REQUEST' : 'UNAVAILABLE' }, { status, headers: { ...headers, ...(status === 429 ? { 'Retry-After': '60' } : {}) } });
  }
}
export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const input = Object.fromEntries(query.entries());
    const { sign, locale } = validateRequest(input);
    if (!requestHasHoroscopeAccess(request, sign)) return NextResponse.json({error:'ACCESS_REQUIRED'},{status:402,headers});
    return NextResponse.json(await getReadingStatus(sign, locale), { headers });
  } catch (error) {
    return NextResponse.json({ error: 'UNAVAILABLE' }, { status: error instanceof HoroscopeRequestError ? error.status : 503, headers });
  }
}
