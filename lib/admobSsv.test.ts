import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { adMobTimestampMs, verifyAdMobCallback } from "./admobSsv";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pem = publicKey.export({ format: "pem", type: "spki" }).toString();
const key = async (id: string) => id === "123" ? pem : undefined;
const query = "ad_unit=1234567890&custom_data=5fbecb2b-58e2-45e2-9d4a-1e10da39ec31&reward_amount=1&reward_item=Dream%20analysis&timestamp=1780000000000&transaction_id=18fa792de1bca816048293fc71035638";
const callback = (data: string) =>
  `https://dreamly.art/ssv?${data}&signature=${sign("sha256", Buffer.from(decodeURIComponent(data)), privateKey).toString("base64url")}&key_id=123`;

test("validates Google's ordered query with an escaped reward description", async () => {
  const result = await verifyAdMobCallback(callback(query), key);
  assert.equal(result?.get("reward_item"), "Dream analysis");
  assert.equal(result?.get("reward_amount"), "1");
});

test("rejects tampered rewards, duplicate parameters, unknown keys and unsigned suffixes", async () => {
  const url = callback(query);
  assert.equal(await verifyAdMobCallback(url.replace("reward_amount=1", "reward_amount=2"), key), null);
  assert.equal(await verifyAdMobCallback(callback(`${query}&reward_amount=2`), key), null);
  assert.equal(await verifyAdMobCallback(url.replace("key_id=123", "key_id=456"), key), null);
  assert.equal(await verifyAdMobCallback(`${url}&reward_amount=2`, key), null);
  assert.equal(await verifyAdMobCallback(url.replace("&reward_item=", "%26reward_item%3D"), key), null);
});

test("normalizes callback timestamps to milliseconds", () => {
  assert.equal(adMobTimestampMs("1780000000000"), 1780000000000);
  assert.equal(adMobTimestampMs("1780000000000123"), 1780000000000);
  assert.ok(Number.isNaN(adMobTimestampMs("1780000000")));
});
