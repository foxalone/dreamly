import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import type { PlanId } from "@/lib/subscriptions/plans";
import type { SubscriptionStatus } from "@/lib/subscriptions/status";
import { paypalFetch } from "./server";
import { planIdFromPaypalPlan } from "./plans";

type PaypalCycle = {
  tenure_type?: string;
  sequence?: number;
  cycles_completed?: number;
  cycles_remaining?: number;
};

type PaypalSubscription = {
  id?: string;
  status?: string;
  plan_id?: string;
  custom_id?: string;
  billing_info?: {
    next_billing_time?: string;
    cycle_executions?: PaypalCycle[];
  };
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export async function fetchPaypalSubscription(subscriptionId: string): Promise<PaypalSubscription> {
  const r = await paypalFetch(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!r.ok) {
    throw new Error(`PayPal subscription lookup failed: ${JSON.stringify(r.json)}`);
  }
  return r.json as PaypalSubscription;
}

function msFromPaypalTime(value?: string | null) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function mapStatus(paypalStatus: string, inTrial: boolean): SubscriptionStatus {
  switch (paypalStatus) {
    case "ACTIVE":
      return inTrial ? "trial" : "active";
    case "CANCELLED":
      return "cancelled";
    case "EXPIRED":
      return "expired";
    case "SUSPENDED":
      return "suspended";
    default:
      return "none";
  }
}

function inTrialCycle(sub: PaypalSubscription) {
  const cycles = sub.billing_info?.cycle_executions ?? [];
  const trial = cycles.find((c) => String(c.tenure_type ?? "").toUpperCase() === "TRIAL");
  if (!trial) return false;
  const remaining = Number(trial.cycles_remaining ?? 0);
  const completed = Number(trial.cycles_completed ?? 0);
  return remaining > 0 || completed < 1;
}

export async function syncPaypalSubscriptionToUser(opts: {
  subscriptionId: string;
  uid?: string;
  raw?: unknown;
}) {
  const sub = await fetchPaypalSubscription(opts.subscriptionId);
  const uid = String(opts.uid || sub.custom_id || "").trim();
  if (!uid) {
    throw new Error("Subscription is missing the Dreamly user id.");
  }

  const paypalStatus = String(sub.status ?? "").toUpperCase();
  const trial = inTrialCycle(sub);
  const status = mapStatus(paypalStatus, trial);
  const accessUntilMs = msFromPaypalTime(sub.billing_info?.next_billing_time);
  const plan: PlanId | null = sub.plan_id ? await planIdFromPaypalPlan(sub.plan_id) : null;

  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const mapRef = db.collection("paypalSubscriptions").doc(opts.subscriptionId);

  const existing = await userRef.get();
  const prevUntil = Number(existing.data()?.accessUntilMs ?? 0);
  const nextUntil =
    accessUntilMs ?? (status === "cancelled" && Number.isFinite(prevUntil) && prevUntil > 0 ? prevUntil : null);

  await db.runTransaction(async (tx) => {
    tx.set(
      mapRef,
      {
        uid,
        subscriptionId: opts.subscriptionId,
        status,
        paypalStatus,
        plan,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const patch: Record<string, unknown> = {
      paypalSubscriptionId: opts.subscriptionId,
      subscriptionStatus: status,
      subscriptionPlan: plan,
      paypalSubscriptionStatus: paypalStatus,
      accessUntilMs: nextUntil,
      trialEndsAtMs: trial ? nextUntil : null,
      subscriptionUpdatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (opts.raw) patch.paypalSubscriptionRaw = opts.raw;
    tx.set(userRef, patch, { merge: true });
  });

  return { uid, status, plan, accessUntilMs: nextUntil };
}

export function subscriptionIdFromWebhook(event: unknown): string {
  const body = asRecord(event);
  const resource = asRecord(body.resource);
  const direct = String(resource.id ?? "").trim();
  const billingAgreement = String(resource.billing_agreement_id ?? "").trim();
  const supplementary = asRecord(resource.supplementary_data);
  const related = String(supplementary.related_ids ? asRecord(supplementary.related_ids).order_id : "").trim();
  if (String(body.event_type ?? "").startsWith("BILLING.SUBSCRIPTION") && direct) return direct;
  return billingAgreement || direct || related;
}
