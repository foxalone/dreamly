#!/usr/bin/env node
/**
 * PayPal subscription wiring check.
 *
 *   npm run paypal-check                 # env + token + plans + webhook + Firestore
 *   npm run paypal-check -- --sub I-XXXX # also dump one PayPal subscription
 *
 * Runs on your Mac (PayPal is unreachable from the Cowork VM). Read-only:
 * it never creates plans, never touches users.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PLANS = {
  monthly: { price: "6.99", currency: "USD", unit: "MONTH", count: 1 },
  yearly: { price: "69.99", currency: "USD", unit: "YEAR", count: 1 },
};
const TRIAL_DAYS = 3;
const WANTED_EVENTS = [
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "PAYMENT.SALE.COMPLETED",
];

let failures = 0;
const ok = (m) => console.log(`  ✅ ${m}`);
const warn = (m) => console.log(`  ⚠️  ${m}`);
const bad = (m) => {
  failures += 1;
  console.log(`  ❌ ${m}`);
};
const section = (t) => console.log(`\n== ${t} ==`);

function env(name) {
  const v = process.env[name];
  return typeof v === "string" && v.trim() ? v.trim() : "";
}
function mask(v) {
  return v ? `${v.slice(0, 6)}…(${v.length})` : "<unset>";
}

function serviceAccount() {
  const inline = env("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (inline) {
    try {
      return JSON.parse(inline);
    } catch {
      // multi-line value: --env-file keeps only the first line; parse the file.
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
  return { ok: r.ok, status: r.status, json };
}

async function main() {
  const subArg = process.argv.indexOf("--sub");
  const subId = subArg > -1 ? process.argv[subArg + 1] : "";

  section("Environment (.env.local)");
  const clientId = env("PAYPAL_CLIENT_ID");
  const secret = env("PAYPAL_CLIENT_SECRET");
  const pub = env("NEXT_PUBLIC_PAYPAL_CLIENT_ID");
  const mode = env("PAYPAL_ENV") || "(unset → live)";
  console.log(`  PAYPAL_ENV=${mode}  API=${base}`);
  clientId ? ok(`PAYPAL_CLIENT_ID ${mask(clientId)}`) : bad("PAYPAL_CLIENT_ID missing");
  secret ? ok(`PAYPAL_CLIENT_SECRET ${mask(secret)}`) : bad("PAYPAL_CLIENT_SECRET missing");
  pub ? ok(`NEXT_PUBLIC_PAYPAL_CLIENT_ID ${mask(pub)}`) : bad("NEXT_PUBLIC_PAYPAL_CLIENT_ID missing (buttons won't render)");
  if (clientId && pub && clientId !== pub) bad("NEXT_PUBLIC_PAYPAL_CLIENT_ID differs from PAYPAL_CLIENT_ID (buttons and API on different apps)");
  const webhookId = env("PAYPAL_WEBHOOK_ID");
  webhookId ? ok(`PAYPAL_WEBHOOK_ID ${mask(webhookId)}`) : bad("PAYPAL_WEBHOOK_ID missing — live webhook route throws without it");
  const baseUrl = env("NEXT_PUBLIC_BASE_URL") || env("BASE_URL");
  baseUrl ? ok(`Site base URL ${baseUrl}`) : warn("NEXT_PUBLIC_BASE_URL unset — return/cancel URLs fall back to the request Origin header (fine on Vercel)");
  for (const n of ["PAYPAL_PLAN_MONTHLY_ID", "PAYPAL_PLAN_YEARLY_ID", "PAYPAL_PRODUCT_ID"]) {
    console.log(`  ${n}=${env(n) || "<unset → auto-created, stored in Firestore config/paypalPlans>"}`);
  }
  console.log("  (Vercel production must carry the same PAYPAL_* values — check with: npx vercel env ls production)");

  section("PayPal OAuth");
  if (!clientId || !secret) {
    bad("cannot get a token without credentials");
  } else {
    const r = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.access_token) {
      token = j.access_token;
      ok(`token OK (app_id=${j.app_id ?? "?"}, expires_in=${j.expires_in}s)`);
    } else {
      bad(`token failed: ${j.error_description || j.error || r.status}`);
    }
  }

  section("Firestore");
  let db = null;
  try {
    if (!getApps().length) initializeApp({ credential: cert(serviceAccount()) });
    db = getFirestore();
    ok("firebase-admin initialised");
  } catch (e) {
    bad(`firebase-admin init failed: ${e.message}`);
  }

  let stored = {};
  if (db) {
    const snap = await db.collection("config").doc("paypalPlans").get();
    stored = snap.exists ? snap.data() : {};
    if (snap.exists) ok(`config/paypalPlans: product=${stored.productId ?? "-"} monthly=${stored.monthlyPlanId ?? "-"} yearly=${stored.yearlyPlanId ?? "-"}`);
    else warn("config/paypalPlans does not exist yet — plans get auto-created on the first checkout (nobody has reached PayPal checkout so far)");
  }

  const planIds = {
    monthly: env("PAYPAL_PLAN_MONTHLY_ID") || stored.monthlyPlanId || "",
    yearly: env("PAYPAL_PLAN_YEARLY_ID") || stored.yearlyPlanId || "",
  };

  section("PayPal billing plans");
  if (!token) {
    bad("skipped (no token)");
  } else {
    for (const [name, spec] of Object.entries(PLANS)) {
      const id = planIds[name];
      if (!id) {
        warn(`${name}: no plan id yet (will be created at first checkout)`);
        continue;
      }
      const r = await pp(`/v1/billing/plans/${encodeURIComponent(id)}`);
      if (!r.ok) {
        bad(`${name} ${id}: lookup failed ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
        continue;
      }
      const p = r.json;
      const status = p.status;
      status === "ACTIVE" ? ok(`${name} ${id} is ACTIVE ("${p.name}")`) : bad(`${name} ${id} status=${status} (must be ACTIVE)`);
      const cycles = p.billing_cycles ?? [];
      const trial = cycles.find((c) => c.tenure_type === "TRIAL");
      const regular = cycles.find((c) => c.tenure_type === "REGULAR");
      if (!trial) bad(`${name}: no TRIAL cycle`);
      else if (trial.frequency?.interval_unit !== "DAY" || Number(trial.frequency?.interval_count) !== TRIAL_DAYS || Number(trial.pricing_scheme?.fixed_price?.value) !== 0)
        bad(`${name}: trial is ${trial.frequency?.interval_count} ${trial.frequency?.interval_unit} @ ${trial.pricing_scheme?.fixed_price?.value}, expected ${TRIAL_DAYS} DAY @ 0`);
      else ok(`${name}: ${TRIAL_DAYS}-day free trial`);
      if (!regular) bad(`${name}: no REGULAR cycle`);
      else {
        const price = regular.pricing_scheme?.fixed_price;
        const match =
          regular.frequency?.interval_unit === spec.unit &&
          Number(regular.frequency?.interval_count) === spec.count &&
          Number(price?.value) === Number(spec.price) &&
          price?.currency_code === spec.currency;
        match
          ? ok(`${name}: ${price.value} ${price.currency_code} / ${spec.count} ${spec.unit}`)
          : bad(`${name}: PayPal charges ${price?.value} ${price?.currency_code} per ${regular.frequency?.interval_count} ${regular.frequency?.interval_unit}, site shows ${spec.price} ${spec.currency} / ${spec.count} ${spec.unit} — plans are immutable, create a new one and set PAYPAL_PLAN_${name.toUpperCase()}_ID`);
      }
    }
  }

  section("PayPal webhook");
  if (!token) {
    bad("skipped (no token)");
  } else {
    const r = await pp("/v1/notifications/webhooks");
    const hooks = r.ok ? r.json.webhooks ?? [] : [];
    if (!r.ok) bad(`list webhooks failed ${r.status}`);
    if (!hooks.length) bad("no webhooks registered on this PayPal app — trial→paid, cancellations and failed payments will never reach Firestore");
    for (const h of hooks) {
      const mine = h.id === webhookId;
      const types = (h.event_types ?? []).map((t) => t.name);
      const all = types.includes("*");
      console.log(`  ${mine ? "→" : " "} ${h.id}  ${h.url}`);
      console.log(`      events: ${all ? "* (all)" : types.join(", ") || "(none)"}`);
      if (mine) {
        /^https:\/\/(www\.)?dreamly\.art\/api\/paypal\/webhook\/?$/.test(h.url)
          ? ok("webhook URL is https://dreamly.art/api/paypal/webhook")
          : bad(`webhook URL is ${h.url} — that is another site's webhook; Dreamly never receives PayPal events. Run: npm run paypal-setup -- --apply`);
        h.url.startsWith("https://") ? ok("https") : bad("webhook URL must be https");
        const missing = all ? [] : WANTED_EVENTS.filter((e) => !types.includes(e));
        missing.length ? bad(`webhook is missing events: ${missing.join(", ")}`) : ok("subscribed to all subscription lifecycle events");
      }
    }
    if (webhookId && !hooks.some((h) => h.id === webhookId)) bad(`PAYPAL_WEBHOOK_ID ${webhookId} is not one of this app's webhooks — signature verification will reject every event`);
  }

  if (db) {
    section("Firestore subscribers");
    const users = await db.collection("users").where("subscriptionStatus", "in", ["trial", "active", "cancelled", "suspended", "expired"]).get();
    const byStatus = {};
    for (const d of users.docs) {
      const s = d.data().subscriptionStatus;
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }
    console.log(`  users with a subscriptionStatus: ${users.size}  ${JSON.stringify(byStatus)}`);
    const subs = await db.collection("paypalSubscriptions").orderBy("updatedAt", "desc").limit(5).get().catch(() => null);
    if (subs && subs.size) {
      console.log("  latest paypalSubscriptions:");
      for (const d of subs.docs) {
        const x = d.data();
        console.log(`    ${d.id}  ${x.status}/${x.paypalStatus}  plan=${x.plan}  uid=${x.uid}`);
      }
    } else {
      warn("paypalSubscriptions is empty — no subscription has ever been activated through the site");
    }
  }

  if (subId && token) {
    section(`Subscription ${subId}`);
    const r = await pp(`/v1/billing/subscriptions/${encodeURIComponent(subId)}`);
    if (!r.ok) bad(`lookup failed ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`);
    else {
      const s = r.json;
      console.log(`  status=${s.status} plan=${s.plan_id} custom_id(uid)=${s.custom_id} next_billing=${s.billing_info?.next_billing_time}`);
      console.log(`  cycles=${JSON.stringify(s.billing_info?.cycle_executions ?? [])}`);
    }
  }

  console.log(failures ? `\n${failures} problem(s) found.` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error("paypal-check crashed:", e);
  process.exit(2);
});
