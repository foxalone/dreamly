import assert from "node:assert/strict";
import { constants, createHash, generateKeyPairSync, sign } from "node:crypto";
import { test } from "node:test";
import { validPetalSignature } from "./petalSsv";

test("Petal verifies the signed ad unit, session and transaction", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const fields = {
    adId: "exampleAd1",
    data: "64032cf6-020d-48d7-a8d9-c30c752aef26",
    rewardAmount: "1",
    rewardName: "Dreamly unlock",
    uniqueId: "0123456789abcdef",
    userId: "",
    newSign: "",
  };
  const expectedContent = "adId=exampleAd1&data=64032cf6-020d-48d7-a8d9-c30c752aef26&rewardAmount=1&rewardName=Dreamly unlock&uniqueId=0123456789abcdef";
  const digest = createHash("sha256").update(expectedContent).digest("hex");
  fields.newSign = sign("sha256", Buffer.from(digest), {
    key: privateKey, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32,
  }).toString("base64");
  const key = publicKey.export({ format: "der", type: "spki" }).toString("base64");
  const pem = Buffer.from(publicKey.export({ format: "pem", type: "spki" })).toString("base64");

  assert.equal(validPetalSignature(fields, key), true);
  assert.equal(validPetalSignature(fields, pem), true);
  for (const mutation of [
    { adId: "anotherAd1" },
    { data: "35c755ba-eabc-4927-9f2a-d0472e0be620" },
    { rewardAmount: "10" },
    { uniqueId: "0123456789abcdefab" },
    { newSign: "invalid" },
  ]) assert.equal(validPetalSignature({ ...fields, ...mutation }, key), false);
});
