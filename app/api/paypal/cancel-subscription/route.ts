import { NextResponse } from "next/server";
import { requireSignedInUid } from "@/app/api/dreams/_lib/requireUser";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { paypalFetch } from "@/lib/paypal/server";
import { syncPaypalSubscriptionToUser } from "@/lib/paypal/syncSubscription";

type Body = { idToken?: unknown };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const auth = await requireSignedInUid(body.idToken);
    if ("error" in auth) return auth.error;

    const snap = await adminDb().collection("users").doc(auth.uid).get();
    const subscriptionId = String(snap.data()?.paypalSubscriptionId ?? "").trim();
    if (!subscriptionId) {
      return NextResponse.json({ error: "No active PayPal subscription." }, { status: 400 });
    }

    const cancelled = await paypalFetch(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason: "Cancelled by user in Dreamly" }),
    });
    if (!cancelled.ok && cancelled.status !== 204) {
      return NextResponse.json(
        { error: "PayPal cancel failed.", raw: cancelled.json },
        { status: 500 }
      );
    }

    const synced = await syncPaypalSubscriptionToUser({
      subscriptionId,
      uid: auth.uid,
    });

    return NextResponse.json({ ok: true, ...synced });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
