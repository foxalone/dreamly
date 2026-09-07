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

    const sub = await fetchPaypalSubscription(subscriptionID);
    const owner = String(sub.custom_id ?? "").trim();
    if (owner && owner !== auth.uid) {
      return NextResponse.json({ error: "Subscription does not belong to this account." }, { status: 403 });
    }

    const synced = await syncPaypalSubscriptionToUser({
      subscriptionId: subscriptionID,
      uid: auth.uid,
      raw: sub,
    });

    return NextResponse.json({ ok: true, ...synced });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
