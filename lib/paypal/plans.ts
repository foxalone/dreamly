import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { SUBSCRIPTION_PLANS, TRIAL_DAYS, type PlanId } from "@/lib/subscriptions/plans";
import { paypalFetch } from "./server";

const CONFIG_DOC = "paypalPlans";

type StoredPlans = {
  productId?: string;
  monthlyPlanId?: string;
  yearlyPlanId?: string;
};

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

function planBody(productId: string, plan: PlanId) {
  const spec = SUBSCRIPTION_PLANS[plan];
  return {
    product_id: productId,
    name: spec.name,
    description: `${spec.name} with a ${TRIAL_DAYS}-day free trial`,
    status: "ACTIVE",
    billing_cycles: [
      {
        frequency: { interval_unit: "DAY", interval_count: TRIAL_DAYS },
        tenure_type: "TRIAL",
        sequence: 1,
        total_cycles: 1,
        pricing_scheme: { fixed_price: { value: "0", currency_code: spec.currency } },
      },
      {
        frequency: { interval_unit: spec.intervalUnit, interval_count: spec.intervalCount },
        tenure_type: "REGULAR",
        sequence: 2,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: spec.price, currency_code: spec.currency } },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: { value: "0", currency_code: spec.currency },
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3,
    },
  };
}

async function ensurePlanId(productId: string, plan: PlanId, stored: StoredPlans) {
  const fromEnv = envPlanId(plan);
  if (fromEnv) return fromEnv;
  const existing = plan === "monthly" ? stored.monthlyPlanId : stored.yearlyPlanId;
  if (existing) return existing;

  const created = await paypalFetch("/v1/billing/plans", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(planBody(productId, plan)),
  });
  const id = String((created.json as { id?: string })?.id ?? "").trim();
  if (!created.ok || !id) {
    throw new Error(`PayPal ${plan} plan create failed: ${JSON.stringify(created.json)}`);
  }

  const status = String((created.json as { status?: string })?.status ?? "");
  if (status && status !== "ACTIVE") {
    await paypalFetch(`/v1/billing/plans/${id}/activate`, { method: "POST" });
  }

  await saveStored(plan === "monthly" ? { monthlyPlanId: id } : { yearlyPlanId: id });
  return id;
}

export async function getPaypalPlanIds() {
  const stored = await loadStored();
  const productId = await ensureProductId(stored);
  const monthlyPlanId = await ensurePlanId(productId, "monthly", stored);
  const yearlyPlanId = await ensurePlanId(productId, "yearly", stored);
  return { productId, monthlyPlanId, yearlyPlanId };
}

export async function planIdFromPaypalPlan(paypalPlanId: string): Promise<PlanId | null> {
  const ids = await getPaypalPlanIds();
  if (paypalPlanId === ids.monthlyPlanId) return "monthly";
  if (paypalPlanId === ids.yearlyPlanId) return "yearly";
  return null;
}
