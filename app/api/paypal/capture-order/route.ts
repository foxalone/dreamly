// app/api/paypal/capture-order/route.ts
import { NextResponse } from "next/server";
import { getPaypalAccessToken, paypalBaseUrl } from "@/lib/paypal/server";
import { CREDIT_PACKS, type PackId } from "@/lib/credits/packs";

import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function initAdmin() {
  if (getApps().length) return;
  const sa = JSON.parse(mustEnv("FIREBASE_SERVICE_ACCOUNT_JSON"));
  initializeApp({ credential: cert(sa) });
}

function safeString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function isPackId(v: string): v is PackId {
  return v in CREDIT_PACKS;
}

export async function POST(req: Request) {
  try {
    initAdmin();

    const db = getFirestore();
    const adminAuth = getAuth();

    const body = await req.json().catch(() => ({}));

    const orderID = safeString(body?.orderID).trim();
    const idToken = safeString(body?.idToken).trim();

    if (!orderID) {
      return NextResponse.json({ error: "Missing orderID" }, { status: 400 });
    }

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 401 });
    }

    // 1️⃣ Проверяем пользователя
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // 2️⃣ Делаем capture в PayPal
    const token = await getPaypalAccessToken();

    const r = await fetch(
      `${paypalBaseUrl()}/v2/checkout/orders/${orderID}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const j = await r.json().catch(() => ({} as any));

    if (!r.ok) {
      return NextResponse.json(
        { error: j?.message || "PayPal capture failed", raw: j },
        { status: 500 }
      );
    }

    const status = safeString(j?.status);
    if (status !== "COMPLETED") {
      return NextResponse.json(
        { error: `Order not completed: ${status || "-"}`, raw: j },
        { status: 400 }
      );
    }

    // 3️⃣ Достаём packId (главное место где обычно ломается)
    const purchaseUnit = j?.purchase_units?.[0] ?? {};

    const packIdRaw =
      safeString(purchaseUnit?.custom_id) ||
      safeString(
        purchaseUnit?.payments?.captures?.[0]?.custom_id
      );

    if (!packIdRaw || !isPackId(packIdRaw)) {
      return NextResponse.json(
        { error: `Unknown pack in order: ${packIdRaw || "-"}`, raw: j },
        { status: 400 }
      );
    }

    const packId = packIdRaw;
    const pack = CREDIT_PACKS[packId];

    // 4️⃣ Идемпотентность (одно начисление на orderID)
    const txRef = db.collection("transactions").doc(orderID);
    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (t) => {
      const existing = await t.get(txRef);
      if (existing.exists) {
        return; // уже начисляли
      }

      t.set(txRef, {
        uid,
        provider: "paypal",
        orderID,
        packId,
        creditsAdded: pack.credits,
        currency: pack.currency,
        amount: pack.price,
        status: "COMPLETED",
        raw: j,
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

    return NextResponse.json({
      ok: true,
      creditsAdded: pack.credits,
      packId,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}