// app/api/paypal/create-order/route.ts
import { NextResponse } from "next/server";
import { CREDIT_PACKS, type PackId } from "@/lib/credits/packs";
import { getPaypalAccessToken, paypalBaseUrl } from "@/lib/paypal/server";

type Body = { packId?: unknown };

function isPackId(v: unknown): v is PackId {
  return typeof v === "string" && v in CREDIT_PACKS;
}

function getBaseUrl(req: Request) {
  // Prefer explicit env base URL (best for prod), fallback to request origin (handy for dev/preview)
  const env =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    "";
  const fromEnv = env.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;

  const origin = req.headers.get("origin")?.trim().replace(/\/+$/, "");
  if (origin) return origin;

  // last resort (shouldn't happen)
  return "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const packId = body?.packId;

    if (!isPackId(packId)) {
      return NextResponse.json({ error: "Invalid packId" }, { status: 400 });
    }

    const pack = CREDIT_PACKS[packId];
    const token = await getPaypalAccessToken();

    const BASE_URL = getBaseUrl(req);
    const RETURN_URL = `${BASE_URL}/app/profile`; // куда возвращаться после оплаты/отмены
    const CANCEL_URL = `${BASE_URL}/app/profile`;

    // ✅ Client controls only packId (server controls price/currency)
    // ✅ packId stored in custom_id so capture-order can credit correctly
    const orderBody = {
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: packId,
          amount: {
            currency_code: String(pack.currency).toUpperCase(),
            value: String(pack.price),
          },
          description: `Dreamly credits: ${pack.credits}`,
        },
      ],
      application_context: {
        brand_name: "Dreamly", // ✅ this changes “Cancel and return to …”
        landing_page: "LOGIN",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: RETURN_URL,
        cancel_url: CANCEL_URL,
      },
    } as const;

    const r = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderBody),
      cache: "no-store",
    });

    const j = await r.json().catch(() => ({} as any));

    if (!r.ok || !j?.id) {
      const msg = j?.message || j?.error_description || "PayPal create order failed";
      return NextResponse.json({ error: msg, raw: j }, { status: 500 });
    }

    return NextResponse.json({ orderID: j.id, packId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}