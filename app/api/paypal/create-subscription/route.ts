import { NextResponse } from "next/server";
import { requireSignedInUid } from "@/app/api/dreams/_lib/requireUser";
import { isPlanId } from "@/lib/subscriptions/plans";
import { getPaypalPlanIds } from "@/lib/paypal/plans";
import { getSiteBaseUrl, paypalFetch } from "@/lib/paypal/server";

type Body = { plan?: unknown; idToken?: unknown };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const auth = await requireSignedInUid(body.idToken);
    if ("error" in auth) return auth.error;
    if (!isPlanId(body.plan)) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const ids = await getPaypalPlanIds();
    const planId = body.plan === "yearly" ? ids.yearlyPlanId : ids.monthlyPlanId;
    const base = getSiteBaseUrl(req);
    const returnUrl = `${base}/app/upgrade?subscribed=1`;
    const cancelUrl = `${base}/app/upgrade?cancelled=1`;

    const created = await paypalFetch("/v1/billing/subscriptions", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: auth.uid,
        application_context: {
          brand_name: "Dreamly",
          locale: "en-US",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      }),
    });

    const subscriptionID = String((created.json as { id?: string })?.id ?? "").trim();
    if (!created.ok || !subscriptionID) {
      return NextResponse.json(
        { error: "PayPal create subscription failed.", raw: created.json },
        { status: 500 }
      );
    }

    return NextResponse.json({ subscriptionID, plan: body.plan });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
