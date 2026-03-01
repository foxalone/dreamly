// app/src/app/api/paypal/verify/route.ts

import { NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { CREDIT_PACKS } from "@/lib/credits/packs";

type PdtData = Record<string, string>;

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

// ---------- parsing/helpers ----------
function firstNonEmpty(...vals: Array<string | undefined | null>) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function safeString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function normMoney(v: string) {
  // "3.9" -> "3.90", "3,90" -> "3.90"
  const s = String(v ?? "").trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n.toFixed(2) : "";
}

function pickGross(data: PdtData) {
  return firstNonEmpty(data["mc_gross"], data["payment_gross"], data["gross"]);
}

function pickCurrency(data: PdtData) {
  return firstNonEmpty(data["mc_currency"], data["currency_code"], data["currency"]);
}

function pickReceiver(data: PdtData) {
  return firstNonEmpty(data["receiver_email"], data["business"]).toLowerCase();
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

// PDT parser: first line SUCCESS/FAIL, then key=value lines
function parsePdt(body: string) {
  const lines = body
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const first = lines[0] ?? "";
  const data: PdtData = {};

  for (const line of lines.slice(1)) {
    const i = line.indexOf("=");
    if (i <= 0) continue;

    const k = line.slice(0, i).trim();
    const rawV = line.slice(i + 1);
    const v = decodeURIComponent(rawV.replace(/\+/g, "%20"));
    data[k] = v;
  }

  return { ok: first === "SUCCESS", first, data };
}

async function fetchTextWithTimeout(url: string, init: RequestInit, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await r.text();
    return { r, text };
  } finally {
    clearTimeout(t);
  }
}

async function pdtVerify(tx: string) {
  const at = mustEnv("PAYPAL_PDT_TOKEN"); // Identity Token

  const form = new URLSearchParams();
  form.set("cmd", "_notify-synch");
  form.set("tx", tx);
  form.set("at", at);

  const { r, text } = await fetchTextWithTimeout(
    pdtEndpoint(),
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      cache: "no-store",
    },
    12000
  );

  // если PayPal отдал не 200 — тоже покажем тело
  if (!r.ok) {
    throw new Error(`PDT HTTP ${r.status}. Raw=${text.slice(0, 400)}`);
  }

  const parsed = parsePdt(text);
  if (!parsed.ok) {
    // САМОЕ ВАЖНОЕ: увидеть Raw, чтобы понять причину FAIL
    throw new Error(`PDT verify failed: ${parsed.first || "UNKNOWN"}. Raw=${text.slice(0, 400)}`);
  }

  return parsed.data;
}

function trimHugeObject(data: PdtData, maxKeys = 120) {
  // чтобы случайно не записать слишком много
  const out: PdtData = {};
  const keys = Object.keys(data).slice(0, maxKeys);
  for (const k of keys) out[k] = data[k];
  return out;
}

export async function POST(req: Request) {
  try {
    initAdmin();

    const db = getFirestore();
    const adminAuth = getAuth();

    const body = (await req.json().catch(() => ({}))) as any;
    const tx = safeString(body?.tx).trim();
    const idToken = safeString(body?.idToken).trim();

    if (!tx) return NextResponse.json({ error: "Missing tx" }, { status: 400 });
    if (!idToken) return NextResponse.json({ error: "Missing idToken" }, { status: 401 });

    // verify user
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // ---- Verify with PayPal PDT (server-to-server) ----
    const data = await pdtVerify(tx);

    const paymentStatus = firstNonEmpty(data["payment_status"]); // "Completed"
    const grossRaw = pickGross(data);
    const currencyRaw = pickCurrency(data);
    const txnId = firstNonEmpty(data["txn_id"], tx);

    // receiver safety check (optional)
    const expectedReceiver = (process.env.PAYPAL_RECEIVER_EMAIL || "").trim().toLowerCase();
    if (expectedReceiver) {
      const receiver = pickReceiver(data);
      if (receiver && receiver !== expectedReceiver) {
        return NextResponse.json({ error: `Receiver mismatch: ${receiver}` }, { status: 400 });
      }
    }

    if (paymentStatus !== "Completed") {
      return NextResponse.json(
        { error: `Not completed: ${paymentStatus || "unknown"}` },
        { status: 400 }
      );
    }

    const gross = normMoney(grossRaw);
    const currency = String(currencyRaw || "").trim().toUpperCase();

    if (!gross || !currency) {
      return NextResponse.json(
        {
          error: `Missing amount/currency from PDT: gross=${grossRaw || "-"} currency=${currencyRaw || "-"}`,
        },
        { status: 400 }
      );
    }

    // packId вычисляем на сервере по сумме/валюте
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

        // debug fields
        receiver: pickReceiver(data),
        payerEmail: firstNonEmpty(data["payer_email"]),
        itemName: firstNonEmpty(data["item_name"]),
        paymentDate: firstNonEmpty(data["payment_date"]),
        pdt: trimHugeObject(data),

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
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}