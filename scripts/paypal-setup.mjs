#!/usr/bin/env node
/**
 * One-time PayPal setup for dreamly.art (idempotent).
 *
 *   npm run paypal-setup            # dry run: shows what would be created
 *   npm run paypal-setup -- --apply # creates product, monthly/yearly plans, webhook
 *
 * Runs on your Mac (PayPal is unreachable from the Cowork VM).
 * Product + plan ids are stored in Firestore config/paypalPlans (same place
 * lib/paypal/plans.ts reads them). The webhook id is printed — put it into
 * PAYPAL_WEBHOOK_ID in .env.local AND Vercel production, then redeploy.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const SITE = "https://dreamly.art";
const WEBHOOK_URL = `${SITE}/api/paypal/webhook`;
const TRIAL_DAYS = 3;
const PLANS = {
  monthly: { name: "Dreamly Monthly", price: "6.99", currency: "USD", unit: "MONTH", count: 1 },
  yearly: { name: "Dreamly Yearly", price: "69.99", currency: "USD", unit: "YEAR", count: 1 },
};
const EVENTS = [
  "BILLING.SUBSCRIPTION.CREATED",
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "BILLING.SUBSCRIPTION.RE-ACTIVATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "PAYMENT.SALE.COMPLETED",
  "PAYMENT.SALE.REFUNDED",
];

const APPLY = process.argv.includes("--apply");
const log = (m) => console.log(`  ${m}`);

function env(name) {
  const v = process.env[name];
  if (typeof v === "string" && v.trim()) return v.trim();
  // node --env-file (esp. Node 24) can swallow the lines that follow the
  // multi-line FIREBASE_SERVICE_ACCOUNT_JSON block; fall back to the raw file.
  try {
    const src = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    const m = src.match(new RegExp(`^${name}=(.*)$`, "m"));
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  } catch {
    return "";
  }
}
function serviceAccount() {
  const inline = env("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (inline) {
    try {
      return JSON.parse(inline);
    } catch {
      const src = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
      const m = src.match(/^FIREBASE_SERVICE_ACCOUNT_JSON=/m);
      if (m) {
        const rest = src.slice(m.index + m[0].length).trimStart();
        let depth = 0, inStr = false, esc = false;
        for (let i = 0; i < rest.length; i++) {
          const c = rest[i];
          if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
          if (c === '"') inStr = true; else if (c === "{") depth++; else if (c === "}" && --depth === 0) return JSON.parse(rest.slice(0, i + 1));
        }
      }
    }
  }
  const p = env("FIREBASE_SERVICE_ACCOUNT_PATH");
  if (!p) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH");
  return JSON.parse(readFileSync(path.isAbsolute(p) ? p : path.join(process.cwd(), p), "utf8"));
}

const base = env("PAYPAL_ENV") === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
let token = "";
async function pp(pathname, init = {}) {
  const r = await fetch(`${base}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${init.method || "GET"} ${pathname} → ${r.status} ${JSON.stringify(json).slice(0, 400)}`);
  return json;
}

function planBody(productId, key) {
  const s = PLANS[key];
  return {
    product_id: productId,
    name: s.name,
    description: `${s.name} with a ${TRIAL_DAYS}-day free trial`,
    status: "ACTIVE",
    billing_cycles: [
      { frequency: { interval_unit: "DAY", interval_count: TRIAL_DAYS }, tenure_type: "TRIAL", sequence: 1, total_cycles: 1,
        pricing_scheme: { fixed_price: { value: "0", currency_code: s.currency } } },
      { frequency: { interval_unit: s.unit, interval_count: s.count }, tenure_type: "REGULAR", sequence: 2, total_cycles: 0,
        pricing_scheme: { fixed_price: { value: s.price, currency_code: s.currency } } },
    ],
    payment_preferences: { auto_bill_outstanding: true, setup_fee: { value: "0", currency_code: s.currency }, setup_fee_failure_action: "CONTINUE", payment_failure_threshold: 3 },
  };
}

async function main() {
  console.log(`\nPayPal setup for ${SITE}  (${APPLY ? "APPLY" : "dry run — add --apply to create"})  API=${base}\n`);
  const clientId = env("PAYPAL_CLIENT_ID"), secret = env("PAYPAL_CLIENT_SECRET");
  if (!clientId || !secret) throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET missing");
  const tr = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const tj = await tr.json();
  if (!tr.ok) throw new Error(`token: ${tj.error_description || tj.error}`);
  token = tj.access_token;
  log("✅ OAuth token");

  if (!getApps().length) initializeApp({ credential: cert(serviceAccount()) });
  const db = getFirestore();
  const cfgRef = db.collection("config").doc("paypalPlans");
  const stored = (await cfgRef.get()).data() ?? {};

  // --- product ---
  let productId = env("PAYPAL_PRODUCT_ID") || stored.productId || "";
  if (productId) log(`product: ${productId} (existing)`);
  else if (APPLY) {
    const p = await pp("/v1/catalogs/products", { method: "POST", body: JSON.stringify({ name: "Dreamly Premium", description: "Dreamly AI dream interpretations and journal", type: "SERVICE", category: "SOFTWARE" }) });
    productId = p.id;
    await cfgRef.set({ productId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    log(`product: ${productId} (created)`);
  } else log("product: would create \"Dreamly Premium\"");

  // --- plans ---
  for (const key of ["monthly", "yearly"]) {
    const field = `${key}PlanId`;
    let id = env(`PAYPAL_PLAN_${key.toUpperCase()}_ID`) || stored[field] || "";
    if (id) {
      const p = await pp(`/v1/billing/plans/${id}`);
      log(`${key} plan: ${id} (existing, ${p.status})`);
      if (p.status !== "ACTIVE" && APPLY) { await pp(`/v1/billing/plans/${id}/activate`, { method: "POST" }); log(`${key} plan: activated`); }
      continue;
    }
    if (!APPLY) { log(`${key} plan: would create ${PLANS[key].name} — ${TRIAL_DAYS}-day $0 trial, then ${PLANS[key].price} ${PLANS[key].currency}/${PLANS[key].unit}`); continue; }
    const p = await pp("/v1/billing/plans", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(planBody(productId, key)) });
    if (p.status !== "ACTIVE") await pp(`/v1/billing/plans/${p.id}/activate`, { method: "POST" });
    await cfgRef.set({ [field]: p.id, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    log(`${key} plan: ${p.id} (created)`);
  }

  // --- webhook ---
  const list = await pp("/v1/notifications/webhooks");
  const hooks = list.webhooks ?? [];
  let mine = hooks.find((h) => h.url === WEBHOOK_URL);
  const currentEnv = env("PAYPAL_WEBHOOK_ID");
  const envHook = hooks.find((h) => h.id === currentEnv);
  if (envHook && envHook.url !== WEBHOOK_URL) log(`⚠️  PAYPAL_WEBHOOK_ID ${currentEnv} belongs to ${envHook.url} — not this site, leaving it untouched`);

  if (mine) {
    const have = new Set((mine.event_types ?? []).map((t) => t.name));
    const missing = EVENTS.filter((e) => !have.has(e) && !have.has("*"));
    log(`webhook: ${mine.id} → ${mine.url} (existing${missing.length ? `, missing ${missing.join(", ")}` : ""})`);
    if (missing.length && APPLY) {
      await pp(`/v1/notifications/webhooks/${mine.id}`, { method: "PATCH", body: JSON.stringify([{ op: "replace", path: "/event_types", value: EVENTS.map((name) => ({ name })) }]) });
      log("webhook: event list updated");
    }
  } else if (APPLY) {
    mine = await pp("/v1/notifications/webhooks", { method: "POST", body: JSON.stringify({ url: WEBHOOK_URL, event_types: EVENTS.map((name) => ({ name })) }) });
    log(`webhook: ${mine.id} → ${WEBHOOK_URL} (created)`);
  } else log(`webhook: would create ${WEBHOOK_URL} with ${EVENTS.length} events`);

  console.log("");
  if (mine && mine.id !== currentEnv) {
    console.log(`NEXT STEP — set this in .env.local AND in Vercel → dreamly → Settings → Environment Variables (Production), then redeploy:\n\n  PAYPAL_WEBHOOK_ID=${mine.id}\n`);
  } else if (mine) console.log("PAYPAL_WEBHOOK_ID already matches. Make sure Vercel production has the same value.\n");
  console.log(APPLY ? "Done. Run `npm run paypal-check` to verify." : "Dry run only — nothing was created.");
}

main().catch((e) => { console.error("paypal-setup failed:", e.message); process.exit(1); });
