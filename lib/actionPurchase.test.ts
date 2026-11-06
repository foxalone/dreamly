import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { actorKey, capturedOrder, fulfillActionOrder, orderMatchesActor, type ActionOrder } from "./paypal/actionPurchase";

const originalFetch = globalThis.fetch;
const oldClient = process.env.PAYPAL_CLIENT_ID;
const oldSecret = process.env.PAYPAL_CLIENT_SECRET;
const oldEnv = process.env.PAYPAL_ENV;
afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.PAYPAL_CLIENT_ID = oldClient;
  process.env.PAYPAL_CLIENT_SECRET = oldSecret;
  process.env.PAYPAL_ENV = oldEnv;
});

test("a captured one-time order requires the completed $0.99 USD payment", async () => {
  process.env.PAYPAL_CLIENT_ID = "test-client";
  process.env.PAYPAL_CLIENT_SECRET = "test-secret";
  process.env.PAYPAL_ENV = "sandbox";
  let status = "COMPLETED", currency = "USD", value = "0.99";
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/v1/oauth2/token")) return Response.json({ access_token: "token" });
    assert.ok(url.endsWith("/v2/checkout/orders/ORDER12345"));
    return Response.json({ status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "CAPTURE123", status, amount: { currency_code: currency, value } }] } }] });
  };
  assert.deepEqual(await capturedOrder("ORDER12345"), { captureId: "CAPTURE123" });
  status = "PENDING";
  await assert.rejects(capturedOrder("ORDER12345"), /PAYMENT_NOT_COMPLETED/);
  status = "COMPLETED"; value = "0.98";
  await assert.rejects(capturedOrder("ORDER12345"), /PAYMENT_NOT_COMPLETED/);
  value = "0.99"; currency = "EUR";
  await assert.rejects(capturedOrder("ORDER12345"), /PAYMENT_NOT_COMPLETED/);
});

test("a purchase belongs to its original account or guest browser", () => {
  const guest: ActionOrder = { actor: { guestId: "guest-a" }, guestId: "guest-a", target: { kind: "love-match" }, next: "/love-compatibility", locale: "en", status: "created", createdAtMs: 1 };
  assert.equal(actorKey(guest.actor), "guest:guest-a");
  assert.equal(orderMatchesActor(guest, { guestId: "guest-a" }, "guest-a"), true);
  assert.equal(orderMatchesActor(guest, { guestId: "guest-b" }, "guest-b"), false);
  assert.equal(orderMatchesActor(guest, { uid: "user-a" }, "guest-a"), false);
  assert.equal(orderMatchesActor({ ...guest, actor: { uid: "user-a" }, target: { kind: "tarot", day: "2026-11-06", cardId: "fool" } }, { uid: "user-a" }, "guest-b"), false);
});

test("retrying a completed order cannot grant a second analysis credit", async () => {
  const documents = new Map<string, Record<string, unknown>>();
  const path = "paypalActionOrders/ORDER12345";
  documents.set(path, { actor: { uid: "user-a" }, guestId: null, target: { kind: "analysis" }, next: "/app/dreams", locale: "en", status: "created", createdAtMs: 1 });
  let grantWrites = 0;
  const doc = (id: string): unknown => ({
    path: id,
    collection: (name: string) => ({ doc: (child: string) => doc(`${id}/${name}/${child}`) }),
  });
  const database = {
    doc,
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
      get: async (ref: { path: string }) => ({ data: () => documents.get(ref.path) }),
      set: (ref: { path: string }) => { if (ref.path === "users/user-a") grantWrites++; },
      update: (ref: { path: string }, patch: Record<string, unknown>) => documents.set(ref.path, { ...documents.get(ref.path), ...patch }),
    }),
  } as unknown as Firestore;
  await fulfillActionOrder("ORDER12345", "CAPTURE123", database);
  await fulfillActionOrder("ORDER12345", "CAPTURE123", database);
  assert.equal(grantWrites, 1);
  assert.equal(documents.get(path)?.status, "completed");
});
