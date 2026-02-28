import { NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { CREDIT_PACKS } from "@/lib/credits/packs";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// ---- Firebase Admin init (works on Vercel too) ----
function initAdmin() {
  if (getApps().length) return;

  // Рекомендуется хранить сервис-аккаунт в env как JSON строку
  // FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
  const saRaw = mustEnv("FIREBASE_SERVICE_ACCOUNT_JSON");
  const sa = JSON.parse(saRaw);

  initializeApp({
    credential: cert(sa),
  });
}

async function paypalAccessToken() {
  const env = process.env.PAYPAL_ENV === "sandbox" ? "sandbox" : "live";
  const base = env === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

  const clientId = mustEnv("PAYPAL_CLIENT_ID");
  const secret = mustEnv("PAYPAL_CLIENT_SECRET");

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const r = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!r.ok) throw new Error(`PayPal token error: ${r.status}`);
  const j = await r.json();
  return { base, accessToken: j.access_token as string };
}

async function paypalGetOrder(base: string, accessToken: string, orderId: string) {
  const r = await fetch(`${base}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`PayPal order fetch error: ${r.status}`);
  return r.json();
}

export async function POST(req: Request) {
  try {
    initAdmin();
    const db = getFirestore();
    const auth = getAuth();

    const { orderId, packId, idToken } = await req.json();

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }
    if (!packId || typeof packId !== "string") {
      return NextResponse.json({ error: "Missing packId" }, { status: 400 });
    }
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Missing idToken" }, { status: 401 });
    }

    const pack = CREDIT_PACKS[packId];
    if (!pack) return NextResponse.json({ error: "Unknown packId" }, { status: 400 });

    // verify user
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // PayPal verify
    const { base, accessToken } = await paypalAccessToken();
    const order = await paypalGetOrder(base, accessToken, orderId);

    const status = order?.status; // COMPLETED expected
    const amount = order?.purchase_units?.[0]?.amount?.value;
    const currency = order?.purchase_units?.[0]?.amount?.currency_code;

    if (status !== "COMPLETED") {
      return NextResponse.json({ error: `Order not completed: ${status}` }, { status: 400 });
    }
    if (currency !== "USD") {
      return NextResponse.json({ error: `Unexpected currency: ${currency}` }, { status: 400 });
    }
    if (String(amount) !== String(pack.price)) {
      return NextResponse.json({ error: `Amount mismatch: ${amount}` }, { status: 400 });
    }

    // Idempotency: one orderId = one transaction doc
    const txRef = db.collection("transactions").doc(orderId);
    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (t) => {
      const txSnap = await t.get(txRef);
      if (txSnap.exists) {
        // already processed
        return;
      }
      t.set(txRef, {
        uid,
        packId,
        creditsAdded: pack.credits,
        amount: pack.price,
        currency,
        status,
        createdAt: FieldValue.serverTimestamp(),
      });
      t.set(
        userRef,
        {
          credits: FieldValue.increment(pack.credits),
          totalPurchasedCredits: FieldValue.increment(pack.credits),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    return NextResponse.json({ ok: true, creditsAdded: pack.credits });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}