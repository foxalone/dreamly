import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { safeNext } from "@/lib/adUnlock";
import { isLocale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/path";
import { ACTION_PRICE, ensureActionPurchasable, orderPath, purchaseActor, resolveActionTarget, type ActionOrder } from "@/lib/paypal/actionPurchase";
import { getSiteBaseUrl, paypalConfigProblems, paypalErrorSummary, paypalFetch } from "@/lib/paypal/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    if (!origin || origin !== new URL(req.url).origin) return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
    const body = await req.json() as Record<string, unknown>;
    if (!body || typeof body !== "object" || JSON.stringify(body).length > 3000) return NextResponse.json({ code: "INVALID_REQUEST" }, { status: 400 });
    const problems = paypalConfigProblems();
    if (problems.length) return NextResponse.json({ code: "PAYPAL_CONFIG" }, { status: 503 });
    const { actor, guestId } = await purchaseActor(req, body.idToken);
    const target = await resolveActionTarget(req, actor, guestId, body);
    await ensureActionPurchasable(actor, guestId, target);
    const locale = isLocale(body.locale as string) ? body.locale as string : "en";
    const next = safeNext(body.next);
    if (next === "/") return NextResponse.json({ code: "INVALID_RETURN" }, { status: 400 });
    const returnPath = localePath("/purchase/return", locale as import("@/lib/i18n/config").Locale);
    const base = getSiteBaseUrl(req);
    const returnUrl = `${base}${returnPath}?next=${encodeURIComponent(next)}`;
    const cancelUrl = `${returnUrl}&cancel=1`;
    const result = await paypalFetch("/v2/checkout/orders", {
      method: "POST",
      headers: { "PayPal-Request-Id": randomUUID(), Prefer: "return=representation" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{ amount: { currency_code: "USD", value: ACTION_PRICE }, description: "Dreamly one-time unlock" }],
        payment_source: { paypal: { experience_context: {
          brand_name: "Dreamly", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW",
          return_url: returnUrl, cancel_url: cancelUrl,
        } } },
      }),
    });
    const data = result.json as { id?: string; links?: Array<{ rel?: string; href?: string }> };
    const orderId = String(data.id ?? "");
    const approveUrl = data.links?.find(link => link.rel === "payer-action" || link.rel === "approve")?.href;
    if (!result.ok || !approveUrl) {
      console.error("[paypal] action order create failed", paypalErrorSummary(result.json));
      return NextResponse.json({ code: "PAYPAL_CREATE_FAILED" }, { status: 502 });
    }
    const order: ActionOrder = { actor, guestId, target, next, locale, status: "created", createdAtMs: Date.now() };
    await adminDb().doc(orderPath(orderId)).create(order);
    return NextResponse.json({ approveUrl }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[paypal] action order error", error);
    const code = error instanceof Error && ["GUEST_REQUIRED", "INVALID_TARGET", "ALREADY_UNLOCKED", "ALREADY_SUBSCRIBED"].includes(error.message) ? error.message : "PAYPAL_CREATE_FAILED";
    return NextResponse.json({ code }, { status: code === "PAYPAL_CREATE_FAILED" ? 503 : 400 });
  }
}
