import { NextResponse } from "next/server";
import { isAttemptEvent } from "@/lib/analysisAttempts";
import { readGuestId } from "../_lib/guestQuota";
import { requireSignedInUid } from "../_lib/requireUser";
import { reportAttemptEvent } from "../_lib/analysisAttempts";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !/^[a-f0-9]{64}$/.test(String(body.attemptId ?? "")) || !isAttemptEvent(body.event)) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const guestId = readGuestId(req);
    const signed = body.idToken ? await requireSignedInUid(String(body.idToken)) : null;
    const uid = signed && !("error" in signed) ? signed.uid : null;
    if (!uid && !guestId) return NextResponse.json({ ok: false }, { status: 401 });
    const ok = await reportAttemptEvent(body.attemptId, uid, guestId, body.event, body.details);
    return NextResponse.json({ ok }, { status: ok ? 200 : 403 });
  } catch { return NextResponse.json({ ok: false }, { status: 500 }); }
}
