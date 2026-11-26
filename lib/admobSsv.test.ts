import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { adMobTimestampMs, configuredAdMobUnit, matchesAdMobUnit, verifyAdMobCallback } from "./admobSsv";

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

test("validates a signed callback after the proxy reorders and form-encodes its query", async () => {
  const url = callback(query);
  const [endpoint, rawQuery] = url.split("?");
  const forwarded = `${endpoint}?${new URLSearchParams(rawQuery.split("&").reverse().join("&"))}`;
  const result = await verifyAdMobCallback(forwarded, key);
  assert.equal(result?.get("custom_data"), "5fbecb2b-58e2-45e2-9d4a-1e10da39ec31");
  assert.equal(result?.get("reward_item"), "Dream analysis");
  assert.equal(result?.get("reward_amount"), "1");
  assert.equal(result?.has("signature"), false);
  assert.equal(await verifyAdMobCallback(forwarded.replace("reward_amount=1", "reward_amount=2"), key), null);
});

test("preserves a literal plus sign from the signed reward description", async () => {
  const result = await verifyAdMobCallback(callback(query.replace("Dream%20analysis", "Dream+analysis")), key);
  assert.equal(result?.get("reward_item"), "Dream+analysis");
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

test("iOS and Android rewarded callbacks require the unit configured for their own platform", () => {
  const androidKey = "ADMOB_ANALYSIS_REWARDED_UNIT_ID";
  const iosKey = "ADMOB_IOS_REWARDED_UNIT_ID";
  const originalAndroid = process.env[androidKey];
  const originalIOS = process.env[iosKey];
  try {
    const android = "ca-app-pub-1111222233334444/100";
    const ios = "ca-app-pub-1111222233334444/200";
    process.env[androidKey] = android;
    delete process.env[iosKey];
    assert.equal(configuredAdMobUnit(), android);
    assert.equal(configuredAdMobUnit("ios"), null);
    process.env[iosKey] = ios;
    assert.equal(configuredAdMobUnit("ios"), ios);
    assert.equal(matchesAdMobUnit("200", configuredAdMobUnit("ios")), true);
    assert.equal(matchesAdMobUnit(ios, configuredAdMobUnit("ios")), true);
    assert.equal(matchesAdMobUnit("100", configuredAdMobUnit("ios")), false);
    assert.equal(matchesAdMobUnit(ios, configuredAdMobUnit()), false);
  } finally {
    if (originalAndroid === undefined) delete process.env[androidKey];
    else process.env[androidKey] = originalAndroid;
    if (originalIOS === undefined) delete process.env[iosKey];
    else process.env[iosKey] = originalIOS;
  }
});
