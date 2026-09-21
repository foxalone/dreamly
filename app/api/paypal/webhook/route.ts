import { NextResponse } from "next/server";
import { logPaypal, paypalFetch } from "@/lib/paypal/server";
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
    const event = (await req.json().catch(() => ({}))) as { id?: unknown; event_type?: unknown };
    const eventId = String(event?.id ?? "");
    const eventType = String(event?.event_type ?? "");
    const ok = await verifyWebhook(req, event);
    if (!ok) {
      logPaypal("warn", "webhook.bad-signature", {
        eventId,
        eventType,
        transmissionId: header(req, "PAYPAL-TRANSMISSION-ID"),
      });
      return NextResponse.json({ error: "Invalid PayPal webhook signature." }, { status: 400 });
    }

    const subscriptionId = subscriptionIdFromWebhook(event);
    if (subscriptionId) {
      const synced = await syncPaypalSubscriptionToUser({ subscriptionId, raw: event });
      logPaypal("info", "webhook.synced", {
        eventId,
        eventType,
        subscriptionId,
        uid: synced.uid,
        status: synced.status,
        plan: synced.plan,
        ignored: "ignored" in synced ? synced.ignored : false,
      });
    } else {
      logPaypal("info", "webhook.no-subscription-id", { eventId, eventType });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    logPaypal("error", "webhook.exception", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
