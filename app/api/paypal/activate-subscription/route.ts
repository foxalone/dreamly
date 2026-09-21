import { NextResponse } from "next/server";
import { requireSignedInUid } from "@/app/api/dreams/_lib/requireUser";
import { fetchPaypalSubscription, syncPaypalSubscriptionToUser } from "@/lib/paypal/syncSubscription";
import { logPaypal } from "@/lib/paypal/server";

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
    logPaypal("info", "activate-subscription.start", { uid: auth.uid, subscriptionID });
    let sub = await fetchPaypalSubscription(subscriptionID);
    let attempts = 0;
    for (; attempts < 4 && !SETTLED.has(String(sub.status ?? "").toUpperCase()); attempts += 1) {
      await new Promise((r) => setTimeout(r, 1500));
      sub = await fetchPaypalSubscription(subscriptionID);
    }
    const owner = String(sub.custom_id ?? "").trim();
    if (owner && owner !== auth.uid) {
      logPaypal("warn", "activate-subscription.wrong-owner", {
        uid: auth.uid,
        subscriptionID,
        ownerUid: owner,
        paypalStatus: sub.status ?? null,
      });
      return NextResponse.json({ error: "Subscription does not belong to this account." }, { status: 403 });
    }

    const synced = await syncPaypalSubscriptionToUser({
      subscriptionId: subscriptionID,
      uid: auth.uid,
      raw: sub,
      strict: true,
    });

    const pending = !SETTLED.has(String(sub.status ?? "").toUpperCase());
    logPaypal(pending ? "warn" : "info", "activate-subscription.synced", {
      uid: auth.uid,
      subscriptionID,
      paypalStatus: sub.status ?? null,
      paypalPlanId: sub.plan_id ?? null,
      status: synced.status,
      plan: synced.plan,
      accessUntilMs: synced.accessUntilMs,
      pending,
      retries: attempts,
    });
    return NextResponse.json({ ok: true, pending, paypalStatus: sub.status ?? null, ...synced });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    logPaypal("error", "activate-subscription.exception", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
