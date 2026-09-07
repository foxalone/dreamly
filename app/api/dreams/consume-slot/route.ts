import { NextResponse } from "next/server";
import { requireSignedInUid } from "../_lib/requireUser";
import { consumeDreamSlot } from "../_lib/subscription";

type Body = { idToken?: unknown };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const auth = await requireSignedInUid(body.idToken);
    if ("error" in auth) return auth.error;
    const slot = await consumeDreamSlot(auth.uid);
    if ("error" in slot) return slot.error;
    return NextResponse.json({ ok: true, ...slot });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
