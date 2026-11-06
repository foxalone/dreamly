import { NextResponse } from "next/server";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { capturedOrder, fulfillActionOrder, orderMatchesActor, orderPath, purchaseActor, type ActionOrder } from "@/lib/paypal/actionPurchase";
import { paypalFetch } from "@/lib/paypal/server";
import { setAccessPass } from "@/lib/horoscope/access-http";
import { subjectOf } from "@/lib/horoscope/access";
import { isSign } from "@/lib/horoscope/model";
import { tarotUnlockResponse, tarotSecret } from "@/lib/tarot/unlock-http";
import { isTarotCardId } from "@/lib/tarot/access";
import { readGuestId } from "@/app/api/dreams/_lib/guestQuota";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    if (!origin || origin !== new URL(req.url).origin) return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
    const body = await req.json() as { orderId?: unknown; idToken?: unknown };
    const orderId = String(body.orderId ?? "");
    const ref = adminDb().doc(orderPath(orderId));
    const snap = await ref.get();
    const order = snap.data() as ActionOrder | undefined;
    if (!order) return NextResponse.json({ code: "ORDER_NOT_FOUND" }, { status: 404 });
    const { actor, guestId } = "guestId" in order.actor
      ? { actor: { guestId: readGuestId(req) ?? "" }, guestId: readGuestId(req) }
      : await purchaseActor(req, body.idToken);
    if (!orderMatchesActor(order, actor, guestId)) return NextResponse.json({ code: "ORDER_OWNER_MISMATCH" }, { status: 403 });
    const expiresAt = order.target.kind === "horoscope" || order.target.kind === "tarot" ? Date.parse(`${order.target.day}T00:00:00Z`) + 86_400_000 : null;
    if (order.status !== "completed" && expiresAt !== null && Date.now() >= expiresAt) return NextResponse.json({ code: "ACTION_EXPIRED" }, { status: 409 });
    if (order.status !== "completed") {
      const capture = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
        method: "POST", headers: { "PayPal-Request-Id": `dreamly-action-${orderId}` }, body: "{}",
      });
      if (!capture.ok && capture.status !== 422) return NextResponse.json({ code: "PAYPAL_CAPTURE_FAILED" }, { status: 502 });
    }
    const { captureId } = await capturedOrder(orderId);
    const completed = await fulfillActionOrder(orderId, captureId);
    const response = NextResponse.json({ ok: true, kind: completed.target.kind, next: completed.next, orderId }, { headers: { "Cache-Control": "private, no-store" } });
    if (completed.target.kind === "horoscope" && isSign(completed.target.sign)) {
      setAccessPass(response, req, { subject: subjectOf(completed.actor), day: completed.target.day, sign: completed.target.sign });
    }
    if (completed.target.kind === "tarot" && guestId && isTarotCardId(completed.target.cardId)) {
      tarotUnlockResponse(response, guestId, completed.target.day, completed.target.cardId, tarotSecret());
    }
    return response;
  } catch (error) {
    console.error("[paypal] action capture error", error);
    return NextResponse.json({ code: "PAYPAL_CAPTURE_FAILED" }, { status: 503 });
  }
}
