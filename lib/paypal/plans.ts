import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { SUBSCRIPTION_PLANS, TRIAL_DAYS, type PlanId } from "@/lib/subscriptions/plans";
import { paypalFetch } from "./server";

const CONFIG_DOC = "paypalPlans";

type StoredPlans = {
  productId?: string;
  monthlyPlanId?: string;
  yearlyPlanId?: string;
  // Same price, no trial cycle: used when a user who already had a Dreamly
  // subscription subscribes again (see create-subscription), so cancelling
  // and re-subscribing never grants another free trial.
  monthlyNoTrialPlanId?: string;
  yearlyNoTrialPlanId?: string;
};

function storedKey(plan: PlanId, withTrial: boolean): keyof StoredPlans {
  if (withTrial) return plan === "monthly" ? "monthlyPlanId" : "yearlyPlanId";
  return plan === "monthly" ? "monthlyNoTrialPlanId" : "yearlyNoTrialPlanId";
}

function envPlanId(plan: PlanId) {
  const name = plan === "monthly" ? "PAYPAL_PLAN_MONTHLY_ID" : "PAYPAL_PLAN_YEARLY_ID";
  return (process.env[name] || "").trim();
}

async function loadStored(): Promise<StoredPlans> {
  const snap = await adminDb().collection("config").doc(CONFIG_DOC).get();
  return snap.exists ? ((snap.data() as StoredPlans) ?? {}) : {};
}

async function saveStored(patch: StoredPlans) {
  await adminDb()
    .collection("config")
    .doc(CONFIG_DOC)
    .set({ ...patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

async function ensureProductId(stored: StoredPlans) {
  const fromEnv = (process.env.PAYPAL_PRODUCT_ID || "").trim();
  if (fromEnv) return fromEnv;
  if (stored.productId) return stored.productId;

  const created = await paypalFetch("/v1/catalogs/products", {
    method: "POST",
    body: JSON.stringify({
      name: "Dreamly Premium",
      description: "Dreamly AI dream interpretations and journal",
      type: "SERVICE",
      category: "SOFTWARE",
    }),
  });
  const id = String((created.json as { id?: string })?.id ?? "").trim();
  if (!created.ok || !id) {
    throw new Error(`PayPal product create failed: ${JSON.stringify(created.json)}`);
  }
  await saveStored({ productId: id });
  return id;
}

function planBody(productId: string, plan: PlanId, withTrial: boolean) {
  const spec = SUBSCRIPTION_PLANS[plan];
  const trialCycle = {
    frequency: { interval_unit: "DAY", interval_count: TRIAL_DAYS },
    tenure_type: "TRIAL",
    sequence: 1,
    total_cycles: 1,
    pricing_scheme: { fixed_price: { value: "0", currency_code: spec.currency } },
  };
  const regularCycle = {
    frequency: { interval_unit: spec.intervalUnit, interval_count: spec.intervalCount },
    tenure_type: "REGULAR",
    sequence: withTrial ? 2 : 1,
    total_cycles: 0,
    pricing_scheme: { fixed_price: { value: spec.price, currency_code: spec.currency } },
  };
  return {
    product_id: productId,
    name: spec.name,
    description: withTrial
      ? `${spec.name} with a ${TRIAL_DAYS}-day free trial`
      : `${spec.name} (renewal, no trial)`,
    status: "ACTIVE",
    billing_cycles: withTrial ? [trialCycle, regularCycle] : [regularCycle],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: { value: "0", currency_code: spec.currency },
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3,
    },
  };
}

async function ensurePlanId(productId: string, plan: PlanId, stored: StoredPlans, withTrial = true) {
  const fromEnv = withTrial ? envPlanId(plan) : "";
  if (fromEnv) return fromEnv;
  const key = storedKey(plan, withTrial);
  const existing = stored[key];
  if (existing) return existing;

  const created = await paypalFetch("/v1/billing/plans", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(planBody(productId, plan, withTrial)),
  });
  const id = String((created.json as { id?: string })?.id ?? "").trim();
  if (!created.ok || !id) {
    throw new Error(
      `PayPal ${plan}${withTrial ? "" : " (no trial)"} plan create failed: ${JSON.stringify(created.json)}`
    );
  }

  const status = String((created.json as { status?: string })?.status ?? "");
  if (status && status !== "ACTIVE") {
    await paypalFetch(`/v1/billing/plans/${id}/activate`, { method: "POST" });
  }

  await saveStored({ [key]: id });
  return id;
}

export async function getPaypalPlanIds() {
  const stored = await loadStored();
  const productId = await ensureProductId(stored);
  const monthlyPlanId = await ensurePlanId(productId, "monthly", stored);
  const yearlyPlanId = await ensurePlanId(productId, "yearly", stored);
  return { productId, monthlyPlanId, yearlyPlanId };
}

/**
 * Plan id for a user who already used their trial: same price, no trial
 * cycle. Created in PayPal on first use and remembered in config/paypalPlans.
 */
export async function getNoTrialPlanId(plan: PlanId) {
  const stored = await loadStored();
  const productId = await ensureProductId(stored);
  return ensurePlanId(productId, plan, stored, false);
}

export async function planIdFromPaypalPlan(paypalPlanId: string): Promise<PlanId | null> {
  const ids = await getPaypalPlanIds();
  if (paypalPlanId === ids.monthlyPlanId) return "monthly";
  if (paypalPlanId === ids.yearlyPlanId) return "yearly";
  // No-trial variants are only looked up, never created here (this runs for
  // every webhook event, including other sites' on the shared PayPal app).
  const stored = await loadStored();
  if (paypalPlanId && paypalPlanId === stored.monthlyNoTrialPlanId) return "monthly";
  if (paypalPlanId && paypalPlanId === stored.yearlyNoTrialPlanId) return "yearly";
  return null;
}
