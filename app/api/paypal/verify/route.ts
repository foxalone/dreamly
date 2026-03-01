// app/src/app/api/paypal/verify/route.ts

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

// ---- Firebase Admin init ----
function initAdmin() {
  if (getApps().length) return;

  const saRaw = mustEnv("FIREBASE_SERVICE_ACCOUNT_JSON");
  const sa = JSON.parse(saRaw);

  initializeApp({ credential: cert(sa) });
}

// PDT endpoint (live/sandbox)
function pdtEndpoint() {
  return process.env.PAYPAL_ENV === "sandbox"
    ? "https://www.sandbox.paypal.com/cgi-bin/webscr"
    : "https://www.paypal.com/cgi-bin/webscr";
}

// PDT parser: first line SUCCESS/FAIL, then key=value lines
function parsePdt(body: string) {
  const lines = body.split("\n").map((s) => s.trim()).filter(Boolean);
  const first = lines[0] ?? "";
  const data: Record<string, string> = {};

  for (const line of lines.slice(1)) {
    const i = line.indexOf("=");
    if (i > 0) {
      const k = line.slice(0, i);
      const v = decodeURIComponent(line.slice(i + 1).replace(/\+/g, "%20"));
      data[k] = v;
    }
  }

  return { ok: first === "SUCCESS", first, data };
}

async function pdtVerify(tx: string) {
  const at = mustEnv("PAYPAL_PDT_TOKEN"); // Identity Token

  const form = new URLSearchParams();
  form.set("cmd", "_notify-synch");
  form.set("tx", tx);
  form.set("at", at);

  const r = await fetch(pdtEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    cache: "no-store",
  });

  const text = await r.text();
  const parsed = parsePdt(text);
  if (!parsed.ok) throw new Error(`PDT verify failed: ${parsed.first}`);

  return parsed.data;
}

// ----- helpers -----
function pickGross(data: Record<string, string>) {
  return data["mc_gross"] ?? data["payment_gross"] ?? data["gross"] ?? "";
}

function pickCurrency(data: Record<string, string>) {
  return data["mc_currency"] ?? data["currency_code"] ?? data["currency"] ?? "";
}

function normMoney(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "";
}

function findPackByAmount(gross: string, currency: string) {
  const g = normMoney(gross);
  const c = String(currency || "").toUpperCase();

  for (const [packId, pack] of Object.entries(CREDIT_PACKS)) {
    if (normMoney(pack.price) === g && String(pack.currency).toUpperCase() === c) {
      return { packId, pack };
    }
  }
  return null;
}

function pickReceiver(data: Record<string, string>) {
  return (data["receiver_email"] || data["business"] || "").trim();
}

export async function POST(req: Request) {
  try {
    initAdmin();

    const db = getFirestore();
    const adminAuth = getAuth();

    const body = await req.json().catch(() => ({}));
    const tx = body?.tx;
    const idToken = body?.idToken;

    if (!tx || typeof tx !== "string") {
      return NextResponse.json({ error: "Missing tx" }, { status: 400 });
    }
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Missing idToken" }, { status: 401 });
    }

    // verify user
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // ---- Verify with PayPal PDT (server-to-server) ----
    const data = await pdtVerify(tx);

    const paymentStatus = (data["payment_status"] || "").trim(); // Completed
    const grossRaw = pickGross(data);
    const currencyRaw = pickCurrency(data);
    const txnId = (data["txn_id"] || tx).trim();

    // ✅ receiver safety check (optional but strongly recommended)
    const expectedReceiver = mustEnv("PAYPAL_RECEIVER_EMAIL").trim().toLowerCase();
    const receiver = pickReceiver(data).toLowerCase();
    if (receiver && receiver !== expectedReceiver) {
      return NextResponse.json(
        { error: `Receiver mismatch: ${receiver}` },
        { status: 400 }
      );
    }

    if (paymentStatus !== "Completed") {
      return NextResponse.json(
        { error: `Not completed: ${paymentStatus || "unknown"}` },
        { status: 400 }
      );
    }

    const gross = normMoney(grossRaw);
    const currency = String(currencyRaw || "").toUpperCase();

    if (!gross || !currency) {
      return NextResponse.json(
        { error: `Missing amount/currency from PDT: gross=${grossRaw} currency=${currencyRaw}` },
        { status: 400 }
      );
    }

    // ✅ packId вычисляем на сервере по сумме/валюте
    const found = findPackByAmount(gross, currency);
    if (!found) {
      return NextResponse.json(
        { error: `Unknown pack for amount: ${gross} ${currency}` },
        { status: 400 }
      );
    }

    const { packId, pack } = found;

    // Idempotency: one txnId = one transaction doc
    const txRef = db.collection("transactions").doc(txnId);
    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (t) => {
      const txSnap = await t.get(txRef);
      if (txSnap.exists) return;

      t.set(txRef, {
        uid,
        packId,
        creditsAdded: pack.credits,
        amount: gross,
        currency,
        paymentStatus,
        rawTx: tx,

        // helpful debug fields
        payerEmail: data["payer_email"] || "",
        itemName: data["item_name"] || "",
        paymentDate: data["payment_date"] || "",

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

    return NextResponse.json({ ok: true, creditsAdded: pack.credits, packId });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}