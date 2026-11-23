import { constants, createHash, createHmac, createPublicKey, verify } from "node:crypto";

const sites = {
  europe: "https://ppscrowd-dre.op.dbankcloud.com/action-lib-track/publickeys",
  asia: "https://ppscrowd-dra.op.dbankcloud.com/action-lib-track/publickeys",
} as const;
const paramsInOrder = ["adId", "data", "rewardAmount", "rewardName", "uniqueId", "userId"] as const;
type KeySet = { keys: Map<string, string>; expiresAt: number };
let cachedKeys: KeySet | undefined;
let keyRequest: Promise<KeySet> | undefined;

function petalConfig() {
  const unit = process.env.PETAL_REWARDED_UNIT_ID?.trim() ?? "";
  const publisher = process.env.PETAL_PUBLISHER_ID?.trim();
  const publisherKey = process.env.PETAL_PUBLISHER_KEY?.trim();
  const site = process.env.PETAL_KEY_SITE === "asia" ? sites.asia : sites.europe;
  if (!/^[a-z0-9]{8,32}$/i.test(unit) || unit.startsWith("test") || !publisher ||
      !publisherKey || !/^[A-Za-z0-9+/]+=*$/.test(publisherKey)) return null;
  return { unit, publisher, publisherKey, site };
}

export function petalRewardUnit() {
  return petalConfig()?.unit ?? null;
}

async function publisherKeys(config: NonNullable<ReturnType<typeof petalConfig>>) {
  if (cachedKeys && cachedKeys.expiresAt > Date.now()) return cachedKeys;
  if (!keyRequest) {
    keyRequest = (async () => {
      const validTime = String(Date.now());
      const response = createHmac("sha256", Buffer.from(config.publisherKey, "base64"))
        .update(validTime + ":/publickeys").digest("hex");
      const result = await fetch(config.site, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
        headers: { userId: config.publisher, Authorization: `Digest validTime="${validTime}", response="${response}"` },
      });
      if (!result.ok) throw new Error("Petal signing keys unavailable");
      const body = await result.json() as { keys?: { keyId: string; publicKey: string }[] };
      const keys = new Map((body.keys ?? []).map(item => [item.keyId, item.publicKey]));
      return { keys, expiresAt: Date.now() + 5 * 60_000 };
    })().finally(() => { keyRequest = undefined; });
  }
  cachedKeys = await keyRequest;
  return cachedKeys;
}

// Huawei signs the ASCII SHA-256 digest of the ordered, decoded parameters.
export function validPetalSignature(fields: Record<string, string>, encodedPublicKey: string) {
  const content = paramsInOrder.filter(key => fields[key]).map(key => `${key}=${fields[key]}`).join("&");
  const digest = createHash("sha256").update(content).digest("hex");
  const derOrPem = Buffer.from(encodedPublicKey, "base64");
  try {
    const key = derOrPem.toString("utf8").startsWith("-----BEGIN PUBLIC KEY-----")
      ? createPublicKey(derOrPem)
      : createPublicKey({ key: derOrPem, format: "der", type: "spki" });
    return verify("sha256", Buffer.from(digest), {
      key, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32,
    }, Buffer.from(fields.newSign, "base64"));
  } catch {
    return false;
  }
}

export async function verifyPetalReward(fields: Record<string, string>) {
  const config = petalConfig();
  if (!config || fields.adId !== config.unit || fields.rewardAmount !== "1" ||
      fields.rewardName !== "Dreamly unlock" || fields.userId ||
      (fields.eventType && fields.eventType !== "adRewarded") ||
      !/^[0-9a-f-]{36}$/.test(fields.data ?? "") || !/^[0-9a-f]{16,128}$/i.test(fields.uniqueId ?? "") ||
      !/^[A-Za-z0-9_-]{1,64}$/.test(fields.keyId ?? "") ||
      !/^[A-Za-z0-9+/_-]{120,2048}={0,2}$/.test(fields.newSign ?? "")) return null;
  const { keys } = await publisherKeys(config);
  const key = keys.get(fields.keyId);
  // Retry on future deliveries, in case Huawei has just rotated its keys.
  if (!key) throw new Error("Unknown Petal signing key");
  if (!validPetalSignature(fields, key)) return null;
  return { unit: config.unit, id: fields.data, transactionId: fields.uniqueId.toLowerCase() };
}
