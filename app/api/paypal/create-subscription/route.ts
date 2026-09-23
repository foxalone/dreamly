import { NextResponse } from "next/server";
import { requireSignedInUid } from "@/app/api/dreams/_lib/requireUser";
import { isPlanId } from "@/lib/subscriptions/plans";
import { getNoTrialPlanId, getPaypalPlanIds } from "@/lib/paypal/plans";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { hasPaidAccess, type UserBillingFields } from "@/lib/subscriptions/status";
import {
  fingerprint,
  getSiteBaseUrl,
  logPaypal,
  paypalConfigProblems,
  paypalErrorSummary,
  paypalFetch,
} from "@/lib/paypal/server";

type Body = { plan?: unknown; idToken?: unknown };

type CreatedSubscription = {
  id?: string;
  status?: string;
  links?: Array<{ rel?: string; href?: string }>;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const auth = await requireSignedInUid(body.idToken);
    if ("error" in auth) return auth.error;
    if (!isPlanId(body.plan)) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    // A checkout started with mismatched client ids can only end on PayPal's
    // generic error page, so fail here with a readable reason instead.
    const problems = paypalConfigProblems();
    if (problems.length) {
      logPaypal("error", "create-subscription.config", { uid: auth.uid, problems });
      return NextResponse.json(
        { error: "PayPal is misconfigured on the server.", code: "PAYPAL_CONFIG", problems },
        { status: 500 }
      );
    }

    // Re-subscribing: a user whose subscription is cancelled but still inside
    // the paid/trial period may buy again. The new subscription is scheduled
    // to start when the current access ends (PayPal `start_time`), and uses
    // the no-trial plan — the trial is granted once per account.
    const userSnap = await adminDb().collection("users").doc(auth.uid).get();
    const billing = (userSnap.data() ?? {}) as UserBillingFields;
    const currentStatus = String(billing.subscriptionStatus ?? "none");
    if (currentStatus === "trial" || currentStatus === "active") {
      logPaypal("warn", "create-subscription.already-subscribed", {
        uid: auth.uid,
        status: currentStatus,
        subscriptionID: billing.paypalSubscriptionId ?? null,
      });
      return NextResponse.json(
        { error: "You already have an active subscription.", code: "ALREADY_SUBSCRIBED" },
        { status: 409 }
      );
    }
    const hadSubscription = !!String(billing.paypalSubscriptionId ?? "").trim();
    const accessUntilMs = Number(billing.accessUntilMs ?? 0);
    const now = Date.now();
    // PayPal rejects a start_time that is not safely in the future.
    const startTime =
      hasPaidAccess(billing, now) && accessUntilMs > now + 5 * 60_000
        ? new Date(accessUntilMs).toISOString()
        : null;

    const ids = await getPaypalPlanIds();
    const planId = hadSubscription
      ? await getNoTrialPlanId(body.plan)
      : body.plan === "yearly"
        ? ids.yearlyPlanId
        : ids.monthlyPlanId;
    const base = getSiteBaseUrl(req);
    // PayPal appends ?subscription_id=I-…&ba_token=BA-…&token=… to return_url.
    // UpgradeClient reads subscription_id when the redirect fallback is used.
    const returnUrl = `${base}/app/upgrade?subscribed=1`;
    const cancelUrl = `${base}/app/upgrade?cancelled=1`;

    logPaypal("info", "create-subscription.start", {
      uid: auth.uid,
      plan: body.plan,
      paypalPlanId: planId,
      withTrial: !hadSubscription,
      startTime,
      clientId: fingerprint(process.env.PAYPAL_CLIENT_ID),
      base,
    });

    const created = await paypalFetch("/v1/billing/subscriptions", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: auth.uid,
        ...(startTime ? { start_time: startTime } : {}),
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

    const json = created.json as CreatedSubscription;
    const subscriptionID = String(json?.id ?? "").trim();
    if (!created.ok || !subscriptionID) {
      const summary = paypalErrorSummary(created.json);
      logPaypal("error", "create-subscription.paypal-failed", {
        uid: auth.uid,
        plan: body.plan,
        paypalPlanId: planId,
        httpStatus: created.status,
        ...summary,
      });
      return NextResponse.json(
        {
          error: "PayPal create subscription failed.",
          code: "PAYPAL_CREATE_FAILED",
          paypal: summary,
        },
        { status: 502 }
      );
    }

    const approveUrl = String(
      (json.links ?? []).find((l) => String(l?.rel ?? "").toLowerCase() === "approve")?.href ?? ""
    ).trim();

    logPaypal("info", "create-subscription.created", {
      uid: auth.uid,
      plan: body.plan,
      subscriptionID,
      paypalStatus: json.status ?? null,
      hasApproveUrl: !!approveUrl,
    });

    return NextResponse.json({
      subscriptionID,
      plan: body.plan,
      approveUrl: approveUrl || null,
      withTrial: !hadSubscription,
      startTime,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    logPaypal("error", "create-subscription.exception", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
