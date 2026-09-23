import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import type { PlanId } from "@/lib/subscriptions/plans";
import { hasPaidAccess, type SubscriptionStatus, type UserBillingFields } from "@/lib/subscriptions/status";
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
  /** Throw instead of silently ignoring a subscription on a plan we don't own. */
  strict?: boolean;
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

  // The PayPal app is shared with other sites (lottopredictor), and PayPal
  // fans every event out to every webhook of the app. A subscription on a
  // plan we do not own must never be written into Dreamly's users/{uid}.
  if (!plan) {
    if (opts.strict) {
      throw new Error(`Subscription ${opts.subscriptionId} is on a foreign PayPal plan (${sub.plan_id ?? "?"}).`);
    }
    console.warn("paypal sync: ignoring subscription on foreign plan", opts.subscriptionId, sub.plan_id);
    return { uid, status, plan: null, accessUntilMs: null, ignored: true as const };
  }

  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const mapRef = db.collection("paypalSubscriptions").doc(opts.subscriptionId);

  const existing = await userRef.get();
  const prevUntil = Number(existing.data()?.accessUntilMs ?? 0);
  const nextUntil =
    accessUntilMs ?? (status === "cancelled" && Number.isFinite(prevUntil) && prevUntil > 0 ? prevUntil : null);

  // After a re-subscribe the user document follows the NEW subscription id.
  // Webhooks for the previous (cancelled/expired) subscription still keep
  // paypalSubscriptions/{id} current but must not overwrite users/{uid}.
  // An explicit uid (activate / cancel routes) takes over — except while the
  // new subscription is still APPROVED/APPROVAL_PENDING (scheduled start) and
  // the user still has access from the old one: then only remember it as
  // pending, and let the ACTIVATED webhook finish the takeover.
  const existingData = (existing.data() ?? {}) as UserBillingFields & { pendingPaypalSubscriptionId?: string | null };
  const currentSubId = String(existingData.paypalSubscriptionId ?? "").trim();
  const pendingSubId = String(existingData.pendingPaypalSubscriptionId ?? "").trim();
  const isCurrent = !currentSubId || currentSubId === opts.subscriptionId || pendingSubId === opts.subscriptionId;
  const unsettled = status === "none";
  const parkAsPending = unsettled && !isCurrent && hasPaidAccess(existingData);
  const touchUser = !parkAsPending && (!!opts.uid || isCurrent);

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
    if (parkAsPending) {
      tx.set(
        userRef,
        { pendingPaypalSubscriptionId: opts.subscriptionId, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return;
    }
    if (!touchUser) return;

    const patch: Record<string, unknown> = {
      paypalSubscriptionId: opts.subscriptionId,
      pendingPaypalSubscriptionId: null,
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

  if (parkAsPending) {
    console.warn("paypal sync: new subscription not active yet, parked as pending", opts.subscriptionId, paypalStatus);
    return { uid, status, plan, accessUntilMs: nextUntil, pending: true as const };
  }
  if (!touchUser) {
    console.warn(
      "paypal sync: subscription is not the user's current one, user doc left alone",
      opts.subscriptionId,
      "current:",
      currentSubId
    );
    return { uid, status, plan, accessUntilMs: nextUntil, staleSubscription: true as const };
  }

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
