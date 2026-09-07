import { NextResponse } from "next/server";
import { paypalFetch } from "@/lib/paypal/server";
import { subscriptionIdFromWebhook, syncPaypalSubscriptionToUser } from "@/lib/paypal/syncSubscription";

function header(req: Request, name: string) {
  return req.headers.get(name) ?? req.headers.get(name.toLowerCase()) ?? "";
}

async function verifyWebhook(req: Request, event: unknown) {
  const webhookId = (process.env.PAYPAL_WEBHOOK_ID || "").trim();
  if (!webhookId) {
    if (process.env.PAYPAL_ENV === "live") {
      throw new Error("Missing PAYPAL_WEBHOOK_ID");
    }
    return true;
  }

  const verified = await paypalFetch("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      auth_algo: header(req, "PAYPAL-AUTH-ALGO"),
      cert_url: header(req, "PAYPAL-CERT-URL"),
      transmission_id: header(req, "PAYPAL-TRANSMISSION-ID"),
      transmission_sig: header(req, "PAYPAL-TRANSMISSION-SIG"),
      transmission_time: header(req, "PAYPAL-TRANSMISSION-TIME"),
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });

  const status = String((verified.json as { verification_status?: string })?.verification_status ?? "");
  return verified.ok && status === "SUCCESS";
}

export async function POST(req: Request) {
  try {
    const event = await req.json().catch(() => ({}));
    const ok = await verifyWebhook(req, event);
    if (!ok) {
      return NextResponse.json({ error: "Invalid PayPal webhook signature." }, { status: 400 });
    }

    const subscriptionId = subscriptionIdFromWebhook(event);
    if (subscriptionId) {
      await syncPaypalSubscriptionToUser({ subscriptionId, raw: event });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("paypal webhook failed:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
