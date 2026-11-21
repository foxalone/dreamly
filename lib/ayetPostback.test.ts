import assert from "node:assert/strict";
import { test } from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { GET } from "@/app/api/featured-horoscope/ayet/postback/route";
import { parseAyetPostback, recordAyetPostback, verifyAyetPostback } from "@/lib/ayetPostback";

test("ayeT postback signatures match the published SHA-256 example", () => {
  const params = new URLSearchParams({
    transaction_id: "8ee08f32ae611231b0a49d1bd66e9bf193132561",
    amount: "0.10",
    payout: "1.50",
    user_id: "testuser123456",
    click_id: "1234abcd5678021",
    offer_name: "TEST OFFER",
  });
  // Public example in ayeT's HMAC Security Hash documentation.
  const key = "9f2228fea0d8e7ce10b2ac36053db14c";
  const signature = "62a32725866780ada1dec3d62232645f2801e05a91df7b0202e9b780f804f04b";
  assert.equal(verifyAyetPostback(params, signature, key), true);
  assert.equal(verifyAyetPostback(params, null, key), false);
  assert.equal(verifyAyetPostback(params, signature, "another-publisher"), false);

  params.set("payout", "2.50");
  assert.equal(verifyAyetPostback(params, signature, key), false);
});

test("ayeT postbacks require populated and unambiguous transaction and slot identifiers", () => {
  const params = new URLSearchParams({
    transaction_id: "r-ayeT-receipt-421",
    external_identifier: "my-test-user-567",
    adslot_id: "16",
    is_sandbox: "1",
    callback_type: "chargeback",
  });
  assert.deepEqual(parseAyetPostback(params), {
    transactionId: "r-ayeT-receipt-421",
    externalIdentifier: "my-test-user-567",
    adSlotId: 16,
    sandbox: true,
    chargeback: true,
  });

  const options = [
    ["transaction_id", "{transaction_id}"],
    ["transaction_id", "../../other"],
    ["external_identifier", ""],
    ["adslot_id", "9007199254740993"],
  ] as const;
  for (const [key, value] of options) {
    const invalid = new URLSearchParams(params);
    invalid.set(key, value);
    assert.equal(parseAyetPostback(invalid), null);
  }

  params.append("transaction_id", "second-receipt");
  assert.equal(parseAyetPostback(params), null);
});

test("a repeated ayeT transaction keeps the original receipt", async () => {
  const stored = new Map<string, unknown>();
  const db = {
    collection: (name: string) => ({ doc: (id: string) => `${name}/${id}` }),
    runTransaction: async (run: (tx: unknown) => Promise<void>) => run({
      get: async (ref: string) => ({ exists: stored.has(ref) }),
      create: (ref: string, data: unknown) => {
        assert.equal(stored.has(ref), false);
        stored.set(ref, data);
      },
    }),
  } as unknown as Firestore;
  const postback = parseAyetPostback(new URLSearchParams({
    transaction_id: "ayet-receipt-421",
    external_identifier: "my-test-user-567",
    adslot_id: "16",
  }));
  assert.ok(postback);

  await recordAyetPostback(db, postback, 1000);
  await recordAyetPostback(db, postback, 2000);

  assert.equal(stored.size, 1);
  assert.deepEqual(stored.get("featured_horoscope_ayet_postbacks/ayet_ayet-receipt-421"), {
    ...postback,
    receivedAtMs: 1000,
  });
});

test("the bare ayeT callback URL returns 200 without recording a conversion", async () => {
  const result = await GET(new Request("https://dreamly.art/api/featured-horoscope/ayet/postback"));
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.equal(await result.text(), "OK");
});
