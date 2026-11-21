import { createHmac, timingSafeEqual } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

export const AYET_POSTBACK_SIGNATURE_HEADER = "X-Ayetstudios-Security-Hash";

const TRANSACTION_ID = /^[a-zA-Z0-9_-]{1,128}$/;
const EXTERNAL_IDENTIFIER = /^[a-zA-Z0-9_-]{3,128}$/;

type AyetPostback = {
  transactionId: string;
  externalIdentifier: string;
  adSlotId: number;
  sandbox: boolean;
  chargeback: boolean;
};

export function verifyAyetPostback(
  params: URLSearchParams,
  signature: string | null,
  publisherKey: string,
) {
  if (!publisherKey || !signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;

  const sorted = new URLSearchParams(params);
  sorted.sort();
  // ayeT uses form encoding for the signed query, including '+' for spaces.
  const expected = createHmac("sha256", publisherKey).update(sorted.toString()).digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}

export function parseAyetPostback(params: URLSearchParams): AyetPostback | null {
  if (new Set(params.keys()).size !== params.size) return null;

  const transactionId = params.get("transaction_id");
  const externalIdentifier = params.get("external_identifier");
  const rawAdSlotId = params.get("adslot_id");
  if (!transactionId || !TRANSACTION_ID.test(transactionId)
    || !externalIdentifier || !EXTERNAL_IDENTIFIER.test(externalIdentifier)
    || !rawAdSlotId || !/^[1-9]\d*$/.test(rawAdSlotId)) return null;

  const adSlotId = Number(rawAdSlotId);
  if (!Number.isSafeInteger(adSlotId)) return null;

  return {
    transactionId,
    externalIdentifier,
    adSlotId,
    sandbox: params.get("is_sandbox") === "1",
    chargeback: params.get("is_chargeback") === "1" || params.get("callback_type") === "chargeback",
  };
}

export async function recordAyetPostback(db: Firestore, postback: AyetPostback, now = Date.now()) {
  const ref = db.collection("featured_horoscope_ayet_postbacks").doc(`ayet_${postback.transactionId}`);

  await db.runTransaction(async tx => {
    // ayeT retries deliveries until it receives HTTP 200. Keep the first receipt.
    if ((await tx.get(ref)).exists) return;
    tx.create(ref, { ...postback, receivedAtMs: now });
  });
}
