import { NextResponse } from "next/server";
import { requireSignedInUid } from "../_lib/requireUser";
import { consumeSaveAccess } from "../_lib/subscription";
import { readClientIp } from "../_lib/guestQuota";

type Body = { idToken?: unknown };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const auth = await requireSignedInUid(body.idToken);
    if ("error" in auth) return auth.error;
    // Diary save: subscribers unlimited; others 5 a day per network, then a rewarded ad per save.
    const slot = await consumeSaveAccess(auth.uid, readClientIp(req));
    if ("error" in slot) return slot.error;
    return NextResponse.json({ ok: true, ...slot });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
