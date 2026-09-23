#!/usr/bin/env node
/**
 * Why does "subscribe again" (cancelled user, no-trial plan, future start_time)
 * end on PayPal's genericError?code=RETRY page?
 *
 *   node --env-file=.env.local scripts/paypal-resub-probe.mjs                # inspect only
 *   node --env-file=.env.local scripts/paypal-resub-probe.mjs --uid <uid>    # another user
 *   node --env-file=.env.local scripts/paypal-resub-probe.mjs --probe        # also create
 *        4 unapproved probe subscriptions and print their approve links
 *   node --env-file=.env.local scripts/paypal-resub-probe.mjs --cleanup      # delete the
 *        users/probe doc and paypalSubscriptions rows the CREATED webhook wrote for probes
 *
 * Runs on your Mac (PayPal is unreachable from the Cowork VM). Probe
 * subscriptions carry custom_id "probe" and are never approved, so they stay
 * APPROVAL_PENDING and never touch users/{uid}.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function env(name) {
  const v = process.env[name];
  if (typeof v === "string" && v.trim()) return v.trim();
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
  return { ok: r.ok, status: r.status, json };
}
const section = (t) => console.log(`\n== ${t} ==`);
const j = (v) => JSON.stringify(v, null, 2);

function cycles(plan) {
  return (plan.billing_cycles ?? []).map(
    (c) =>
      `${c.sequence}:${c.tenure_type} ${c.frequency?.interval_count}${c.frequency?.interval_unit} x${c.total_cycles} @${c.pricing_scheme?.fixed_price?.value ?? "?"} ${c.pricing_scheme?.fixed_price?.currency_code ?? ""}`
  );
}

async function main() {
  const uidArg = process.argv.indexOf("--uid");
  const uid = uidArg > -1 ? process.argv[uidArg + 1] : "sGbA77TlcsatEMrgEvCv7Shjrj32";
  const probe = process.argv.includes("--probe");

  const clientId = env("PAYPAL_CLIENT_ID");
  const secret = env("PAYPAL_CLIENT_SECRET");
  const r = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const tj = await r.json();
  if (!tj.access_token) throw new Error(`PayPal token failed: ${j(tj)}`);
  token = tj.access_token;

  if (!getApps().length) initializeApp({ credential: cert(serviceAccount()) });
  const db = getFirestore();

  if (process.argv.includes("--cleanup")) {
    section("Cleanup: probe leftovers in Firestore");
    const probeUser = await db.collection("users").doc("probe").get();
    if (probeUser.exists) { await probeUser.ref.delete(); console.log("  deleted users/probe"); }
    const rows = await db.collection("paypalSubscriptions").where("uid", "==", "probe").get();
    for (const d of rows.docs) { await d.ref.delete(); console.log(`  deleted paypalSubscriptions/${d.id}`); }
    console.log(`  done (${rows.size} rows)`);
    return;
  }

  section("config/paypalPlans");
  const stored = (await db.collection("config").doc("paypalPlans").get()).data() ?? {};
  console.log(j(stored));
  for (const key of ["monthlyPlanId", "yearlyPlanId", "monthlyNoTrialPlanId", "yearlyNoTrialPlanId"]) {
    const id = stored[key];
    if (!id) { console.log(`  ${key}: <not created yet>`); continue; }
    const p = await pp(`/v1/billing/plans/${id}`);
    if (!p.ok) { console.log(`  ${key} ${id}: ❌ ${p.status} ${j(p.json)}`); continue; }
    console.log(`  ${key} ${id}: ${p.json.status} "${p.json.name}" product=${p.json.product_id}`);
    console.log(`     cycles: ${cycles(p.json).join(" | ")}`);
  }

  section(`users/${uid}`);
  const u = (await db.collection("users").doc(uid).get()).data() ?? {};
  const pick = {};
  for (const k of ["subscriptionStatus", "subscriptionPlan", "paypalSubscriptionId", "pendingPaypalSubscriptionId", "paypalSubscriptionStatus", "accessUntilMs", "trialEndsAtMs"]) pick[k] = u[k] ?? null;
  console.log(j(pick));
  if (pick.accessUntilMs) console.log(`  accessUntil = ${new Date(pick.accessUntilMs).toISOString()}  (now ${new Date().toISOString()})`);

  for (const id of [pick.paypalSubscriptionId, pick.pendingPaypalSubscriptionId].filter(Boolean)) {
    section(`PayPal subscription ${id}`);
    const s = await pp(`/v1/billing/subscriptions/${id}`);
    if (!s.ok) { console.log(`❌ ${s.status} ${j(s.json)}`); continue; }
    const { status, plan_id, custom_id, start_time, create_time, status_update_time, billing_info } = s.json;
    console.log(j({ status, plan_id, custom_id, start_time, create_time, status_update_time, next_billing_time: billing_info?.next_billing_time, cycle_executions: billing_info?.cycle_executions }));
  }

  section("paypalSubscriptions for this uid (Firestore)");
  const subs = await db.collection("paypalSubscriptions").where("uid", "==", uid).get();
  subs.forEach((d) => console.log(`  ${d.id}: ${j(d.data())}`));

  if (!probe) {
    console.log("\nRe-run with --probe to create unapproved test subscriptions and get approve links to open in a browser.");
    return;
  }

  section("Probe subscriptions (open each approve link in a browser; do NOT approve)");
  const noTrial = stored.monthlyNoTrialPlanId;
  const withTrial = stored.monthlyPlanId;
  const until = Number(pick.accessUntilMs || 0);
  const future = until > Date.now() + 5 * 60_000 ? until : Date.now() + 24 * 3600_000;
  const startIso = new Date(future).toISOString();
  const startNoMs = startIso.replace(/\.\d{3}Z$/, "Z");
  const variants = [
    { name: "A: no-trial plan + start_time (what the site sends)", plan_id: noTrial, start_time: startIso },
    { name: "B: no-trial plan + start_time without milliseconds", plan_id: noTrial, start_time: startNoMs },
    { name: "C: no-trial plan, immediate start", plan_id: noTrial },
    { name: "D: trial plan + start_time", plan_id: withTrial, start_time: startNoMs },
  ];
  for (const v of variants) {
    if (!v.plan_id) { console.log(`\n${v.name}: skipped, plan not created yet`); continue; }
    const body = {
      plan_id: v.plan_id,
      custom_id: "probe",
      ...(v.start_time ? { start_time: v.start_time } : {}),
      application_context: {
        brand_name: "Dreamly",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: "https://dreamly.art/app/upgrade?probe=1",
        cancel_url: "https://dreamly.art/app/upgrade?probe=1",
      },
    };
    const c = await pp("/v1/billing/subscriptions", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(body) });
    console.log(`\n${v.name}`);
    if (!c.ok) { console.log(`  ❌ ${c.status} ${j(c.json)}`); continue; }
    const approve = (c.json.links ?? []).find((l) => l.rel === "approve")?.href;
    console.log(`  id=${c.json.id} status=${c.json.status} start_time=${c.json.start_time ?? "-"}`);
    console.log(`  approve: ${approve}`);
  }
  console.log("\nOpen the approve links: the variant(s) that show PayPal's review page instead of the generic error tell us what PayPal rejects.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
