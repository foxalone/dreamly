import { NextResponse } from "next/server";
import { requireSignedInUid } from "@/app/api/dreams/_lib/requireUser";
import { fetchPaypalSubscription, syncPaypalSubscriptionToUser } from "@/lib/paypal/syncSubscription";

type Body = { subscriptionID?: unknown; idToken?: unknown };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const auth = await requireSignedInUid(body.idToken);
    if ("error" in auth) return auth.error;

    const subscriptionID = String(body.subscriptionID ?? "").trim();
    if (!subscriptionID) {
      return NextResponse.json({ error: "Missing subscriptionID." }, { status: 400 });
    }

    // onApprove can fire a moment before PayPal flips the subscription to
    // ACTIVE (APPROVAL_PENDING / APPROVED). Re-read a few times so the user
    // does not land in Firestore as "none" and get bounced back to the paywall.
    const SETTLED = new Set(["ACTIVE", "CANCELLED", "SUSPENDED", "EXPIRED"]);
    let sub = await fetchPaypalSubscription(subscriptionID);
    for (let attempt = 0; attempt < 4 && !SETTLED.has(String(sub.status ?? "").toUpperCase()); attempt += 1) {
      await new Promise((r) => setTimeout(r, 1500));
      sub = await fetchPaypalSubscription(subscriptionID);
    }
    const owner = String(sub.custom_id ?? "").trim();
    if (owner && owner !== auth.uid) {
      return NextResponse.json({ error: "Subscription does not belong to this account." }, { status: 403 });
    }

    const synced = await syncPaypalSubscriptionToUser({
      subscriptionId: subscriptionID,
      uid: auth.uid,
      raw: sub,
    });

    const pending = !SETTLED.has(String(sub.status ?? "").toUpperCase());
    if (pending) {
      console.warn("activate-subscription: still", sub.status, "after retries", subscriptionID);
    }
    return NextResponse.json({ ok: true, pending, paypalStatus: sub.status ?? null, ...synced });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
