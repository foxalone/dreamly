import { NextResponse } from 'next/server';
import { requireAdmin } from '../_lib/auth';
import { adminDb } from '../_lib/firebaseAdmin';
import { summarizeHoroscopeRequests, validReportRange } from '@/lib/horoscope/request-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    const from = params.get('from') ?? '', to = params.get('to') ?? '';
    if (!validReportRange(from, to)) return NextResponse.json({ error: 'INVALID_RANGE' }, { status: 400, headers });
    const snapshot = await adminDb().collectionGroup('signs').where('day', '>=', from).where('day', '<=', to).limit(10001).get();
    // Never present a silently truncated count as a complete report.
    if (snapshot.size > 10000) return NextResponse.json({ error: 'RANGE_TOO_LARGE' }, { status: 422, headers });
    const rows = summarizeHoroscopeRequests(snapshot.docs.map(doc => ({ path: doc.ref.path, data: doc.data() })), from, to);
    return NextResponse.json({ rows, total: rows.reduce((sum, row) => sum + row.total, 0) }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 500;
    const indexRequired = (error as { code?: number })?.code === 9;
    return NextResponse.json({ error: indexRequired ? 'INDEX_REQUIRED' : 'REPORT_FAILED' }, { status, headers });
  }
}
