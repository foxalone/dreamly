import { randomUUID } from "node:crypto";
import type { DocumentReference } from "firebase-admin/firestore";
import { PRIMARY_ADMIN_UID } from "./auth/adminUid";
import sharp from "sharp";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { buildGothicImagePrompt } from "@/lib/adminAiImage";
import { getDreamImagePublication, imagePublication, isImageVisible, publishAutomaticImage, type Publication } from "./dreamImageGallery";

const MINUTE = 60_000;
const LEASE_MS = 2 * MINUTE;
const AD_SESSION_MS = 8 * MINUTE;
const IMAGE_LIMIT_BYTES = 700_000;
const WEB_REWARD_DAILY_LIMIT = 3;

type Platform = "web" | "android";
type Job = {
  state?: "working" | "saved" | "failed"; rewarded?: boolean; rewardedAt?: number;
  leaseUntil?: number; runId?: string; attemptedAt?: number; confirmationUntil?: number;
};
export type ImageScope = "journal" | "feed";
type Attempt = { scope?: ImageScope; uid: string; dreamId: string; platform: Platform; unit?: string; issuedAt: number; expiresAt: number };

export class DreamImageError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); }
}

export function validImageId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id);
}

export function imageAdUnit() {
  const unit = process.env.ADMOB_DREAM_IMAGE_REWARDED_UNIT_ID?.trim();
  return unit && /^ca-app-pub-\d{16}\/\d+$/.test(unit)
    && !unit.startsWith("ca-app-pub-3940256099942544/") ? unit : null;
}

function imageWebAdPath() {
  const path = process.env.GOOGLE_DREAM_IMAGE_REWARDED_WEB_PATH?.trim() ?? "";
  return /^\/\d+\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(path) ? path : null;
}

export function matchesWebImageAttempt(attempt: Attempt | undefined, uid: string, id: string, path: string, now: number, scope: ImageScope = "journal") {
  return attempt?.platform === "web" && (attempt.scope ?? "journal") === scope && attempt.uid === uid && attempt.dreamId === id
    && attempt.unit === path && attempt.issuedAt <= now && attempt.expiresAt > now;
}

export function matchesAndroidImageAttempt(attempt: Attempt | undefined, uid: string, id: string, now: number, scope: ImageScope) {
  return attempt?.platform === "android" && (attempt.scope ?? "journal") === scope && attempt.uid === uid && attempt.dreamId === id
    && attempt.issuedAt <= now && attempt.expiresAt > now;
}

function imageStorage(dream: DocumentReference) {
  if (dream.parent.path === "shared_dreams") {
    return { job: dream.collection("private").doc("imageJob"), asset: dream.collection("private").doc("imageAsset") };
  }
  const owner = dream.parent.parent!;
  return { job: owner.collection("dreamImageJobs").doc(dream.id), asset: owner.collection("dreamImageAssets").doc(dream.id) };
}

function references(uid: string, id: string, scope: ImageScope = "journal") {
  if (scope === "feed" && uid !== PRIMARY_ADMIN_UID) throw new DreamImageError("FORBIDDEN", 403);
  const db = adminDb();
  const owner = db.collection("users").doc(uid);
  const dream = scope === "feed" ? db.collection("shared_dreams").doc(id) : owner.collection("dreams").doc(id);
  return { owner, dream, ...imageStorage(dream) };
}

function dreamText(data: FirebaseFirestore.DocumentData | undefined) {
  if (!data || data.deleted || (data.sourceType && data.sourceType !== "dream")
    || typeof data.text !== "string" || !data.text.trim()) {
    throw new DreamImageError("DREAM_NOT_FOUND", 404);
  }
  return data.text.trim().slice(0, 4000);
}

export function dreamImageState(job?: Job, now = Date.now()) {
  if (job?.rewarded && job.state === "saved") return "ready";
  if (job?.rewarded && job.state === "failed") return "failed";
  if (!job?.rewarded && (job?.confirmationUntil ?? 0) > now) return "awaiting-confirmation";
  if (job?.state === "working") {
    if ((job.leaseUntil ?? 0) <= now) return job.rewarded ? "failed" : "new";
    return job.rewarded ? "working" : "awaiting-ad";
  }
  if (job?.rewarded) return (job.rewardedAt ?? 0) > now - 5000 ? "working" : "failed";
  return "new";
}

function dailyBudget(now: number) {
  const day = new Date(now).toISOString().slice(0, 10);
  const cap = Number(process.env.DREAM_IMAGE_DAILY_LIMIT ?? 100);
  return {
    day, ref: adminDb().collection("dreamImageDailyBudgets").doc(day),
    limit: Number.isSafeInteger(cap) && cap > 0 ? cap : 100,
  };
}

export async function imageStatus(uid: string, id: string, scope: ImageScope = "journal") {
  const { dream, job } = references(uid, id, scope);
  const [entry, image, publication] = await adminDb().getAll(dream, job, imagePublication(dream));
  dreamText(entry.data());
  const state = dreamImageState(image.data());
  return { state, published: state === "ready" && await isImageVisible(publication.data() as Publication | undefined, dream, entry.data()) };
}

export async function setImagePublication(uid: string, id: string, published: boolean, scope: ImageScope = "journal") {
  const { dream, job } = references(uid, id, scope);
  const publication = imagePublication(dream);
  return dream.firestore.runTransaction(async tx => {
    const [entry, image, existing] = await tx.getAll(dream, job, publication);
    dreamText(entry.data());
    if (dreamImageState(image.data()) !== "ready") throw new DreamImageError("IMAGE_NOT_READY", 409);
    if (published) {
      tx.set(publication, { dreamPath: dream.path, publishedAt: existing.get("publishedAt") ?? Date.now(), automatic: false });
    } else {
      tx.delete(publication);
    }
    tx.update(job, { galleryHidden: !published });
    return { state: "ready", published };
  });
}

export async function readImage(uid: string, id: string, scope: ImageScope = "journal") {
  const { dream, job, asset } = references(uid, id, scope);
  const [entry, image] = await adminDb().getAll(dream, job);
  dreamText(entry.data());
  if (dreamImageState(image.data()) !== "ready") throw new DreamImageError("IMAGE_NOT_READY", 409);
  const bytes = (await asset.get()).data()?.bytes;
  if (!Buffer.isBuffer(bytes) || !bytes.length) throw new DreamImageError("IMAGE_NOT_READY", 409);
  return bytes;
}

async function createDreamThumbnail(image: Buffer) {
  return sharp(image).resize({ width: 320, withoutEnlargement: true }).webp({ quality: 64 }).toBuffer();
}

export async function readGalleryImage(id: string, thumb: boolean) {
  const db = adminDb();
  const found = await getDreamImagePublication(db, id);
  if (!found) throw new DreamImageError("IMAGE_NOT_READY", 404);
  const { dream, publication } = found;
  const { job, asset } = imageStorage(dream);
  const field = thumb ? "thumbnail" : "bytes";
  const [entry, image, saved] = await db.getAll(dream, job, asset, {
    fieldMask: ["deleted", "shared", "sourceType", "text", "state", "rewarded", field],
  });
  dreamText(entry.data());
  if (dreamImageState(image.data()) !== "ready" || !await isImageVisible(publication, dream, entry.data())) {
    throw new DreamImageError("IMAGE_NOT_READY", 404);
  }
  const bytes = saved.get(field);
  if (Buffer.isBuffer(bytes) && bytes.length) return bytes;

  // Older assets contain only the full image. New generations store both sizes.
  if (thumb && saved.exists) {
    const [full] = await db.getAll(asset, { fieldMask: ["bytes"] });
    const original = full.get("bytes");
    if (Buffer.isBuffer(original) && original.length) return createDreamThumbnail(original);
  }
  throw new DreamImageError("IMAGE_NOT_READY", 404);
}

export async function createImageAttempt(uid: string, id: string, platform: Platform, scope: ImageScope = "journal") {
  const db = adminDb();
  const { owner, dream, job } = references(uid, id, scope);
  const attemptId = randomUUID();
  return db.runTransaction(async tx => {
    const [entry, image] = await tx.getAll(dream, job);
    dreamText(entry.data());
    const current = image.data() as Job | undefined;
    const now = Date.now();
    const state = dreamImageState(current, now);
    if (current?.rewarded || state === "awaiting-confirmation") return { state };
    const webPath = platform === "web" ? imageWebAdPath() : null;
    const unit = platform === "android" ? imageAdUnit() : webPath;
    if (!process.env.FAL_KEY?.trim() || !unit) throw new DreamImageError("AD_UNAVAILABLE", 503);
    const budget = dailyBudget(now);
    if (current?.state !== "saved" && Number((await tx.get(budget.ref)).data()?.count ?? 0) >= budget.limit) {
      throw new DreamImageError("IMAGE_LIMIT", 429);
    }
    if (webPath) {
      const allowance = owner.collection("dreamImageDailyBudgets").doc(budget.day);
      if (Number((await tx.get(allowance)).get("webRewards") ?? 0) >= WEB_REWARD_DAILY_LIMIT) {
        throw new DreamImageError("IMAGE_LIMIT", 429);
      }
    }
    if ((current?.attemptedAt ?? 0) > now - 5000) throw new DreamImageError("PLEASE_RETRY", 429);
    tx.set(job, { attemptedAt: now }, { merge: true });
    tx.create(db.collection("dreamImageAdAttempts").doc(attemptId), {
      uid, dreamId: id, platform, scope, unit, issuedAt: now, expiresAt: now + AD_SESSION_MS,
    } satisfies Attempt);
    const seconds = Number(process.env.DREAM_IMAGE_AD_MAX_SECONDS ?? 60);
    const adMaxSeconds = Number.isInteger(seconds) && seconds >= 15 && seconds <= 60 ? seconds : 60;
    return {
      state: "ad", attemptId, adMaxSeconds,
      ...(webPath ? { google: { path: webPath } } : { unit }),
    };
  });
}

export async function imageAttempt(attemptId: string) {
  return (await adminDb().collection("dreamImageAdAttempts").doc(attemptId).get()).data() as Attempt | undefined;
}

export async function markImageAdPlayed(uid: string, id: string, attemptId: string, scope: ImageScope = "journal") {
  const db = adminDb();
  const attempt = db.collection("dreamImageAdAttempts").doc(attemptId);
  const { job } = references(uid, id, scope);
  await db.runTransaction(async tx => {
    const [session, image] = await tx.getAll(attempt, job);
    const issued = session.data() as Attempt | undefined;
    const now = Date.now();
    if (!matchesAndroidImageAttempt(issued, uid, id, now, scope)) {
      throw new DreamImageError("AD_UNVERIFIED", 403);
    }
    if (!image.data()?.rewarded && !session.data()?.playedAt) {
      tx.update(attempt, { playedAt: now });
      tx.set(job, { confirmationUntil: now + 2 * MINUTE }, { merge: true });
    }
  });
}

export async function claimWebImageReward(uid: string, id: string, attemptId: string, scope: ImageScope = "journal") {
  const path = imageWebAdPath();
  if (!path) throw new DreamImageError("AD_UNAVAILABLE", 503);
  const db = adminDb();
  const { owner, dream, job } = references(uid, id, scope);
  const attempt = db.collection("dreamImageAdAttempts").doc(attemptId);
  await db.runTransaction(async tx => {
    const [entry, image, session] = await tx.getAll(dream, job, attempt);
    dreamText(entry.data());
    const now = Date.now();
    if (!matchesWebImageAttempt(session.data() as Attempt | undefined, uid, id, path, now, scope)) {
      throw new DreamImageError("AD_UNVERIFIED", 403);
    }
    if (image.get("rewarded") === true) return;
    if (session.get("claimedAt")) throw new DreamImageError("AD_UNVERIFIED", 403);

    // Web GPT reports the reward in the browser. This quota bounds the cost of client-reported grants.
    const { day } = dailyBudget(now);
    const allowance = owner.collection("dreamImageDailyBudgets").doc(day);
    const used = Number((await tx.get(allowance)).get("webRewards") ?? 0);
    if (used >= WEB_REWARD_DAILY_LIMIT) throw new DreamImageError("IMAGE_LIMIT", 429);
    const saved = image.get("state") === "saved";
    if (saved && scope === "journal") await publishAutomaticImage(tx, dream, entry.data(), image.data());
    tx.set(allowance, { webRewards: used + 1 }, { merge: true });
    tx.update(attempt, { claimedAt: now });
    tx.set(job, { rewarded: true, rewardedAt: now }, { merge: true });
    if (saved) tx.update(dream, scope === "feed" ? { adminFeedImageReady: true } : { dreamImageReady: true });
  });
  return beginImage(uid, id, undefined, scope);
}

export async function confirmImageReward(attemptId: string, attempt: Attempt, transactionId: string) {
  const db = adminDb();
  const scope = attempt.scope ?? "journal";
  const { dream, job } = references(attempt.uid, attempt.dreamId, scope);
  const receipt = db.collection("dreamImageAdReceipts").doc(`${attempt.platform}_${transactionId}`);
  return db.runTransaction(async tx => {
    const [entry, image, used] = await tx.getAll(dream, job, receipt);
    if (!entry.exists || entry.data()?.deleted) return false;
    if (used.exists) {
      if (used.data()?.attemptId !== attemptId) throw new DreamImageError("AD_UNVERIFIED", 403);
      return false;
    }
    const current = image.data();
    const saved = current?.state === "saved";
    if (!current?.rewarded && saved && scope === "journal") await publishAutomaticImage(tx, dream, entry.data(), current);
    tx.create(receipt, { attemptId, confirmedAt: Date.now() });
    if (current?.rewarded) return false;
    tx.set(job, { rewarded: true, rewardedAt: Date.now() }, { merge: true });
    if (saved) tx.update(dream, scope === "feed" ? { adminFeedImageReady: true } : { dreamImageReady: true });
    return true;
  });
}

export async function beginImage(uid: string, id: string, attemptId?: string, scope: ImageScope = "journal") {
  const db = adminDb();
  const { dream, job, asset } = references(uid, id, scope);
  const key = process.env.FAL_KEY?.trim();
  if (!key) throw new DreamImageError("IMAGE_UNAVAILABLE", 503);
  const now = Date.now();
  const budget = dailyBudget(now);
  const allowance = db.collection("users").doc(uid).collection("dreamImageDailyBudgets").doc(budget.day);
  const runId = randomUUID();
  const claim = await db.runTransaction(async tx => {
    const [entry, image] = await tx.getAll(dream, job);
    const text = dreamText(entry.data());
    const current = image.data() as Job | undefined;
    if (!current?.rewarded) {
      const attempt = attemptId ? (await tx.get(db.collection("dreamImageAdAttempts").doc(attemptId))).data() as Attempt | undefined : undefined;
      if (!matchesAndroidImageAttempt(attempt, uid, id, now, scope)) {
        throw new DreamImageError("AD_UNVERIFIED", 403);
      }
    }
    if (current?.state === "saved" || (current?.state === "working" && (current.leaseUntil ?? 0) > now)) {
      return { state: dreamImageState(current), text: null };
    }
    const [total, personal] = await tx.getAll(budget.ref, allowance);
    const count = Number(total.data()?.count ?? 0);
    const pending = Number(personal.data()?.count ?? 0);
    if (count >= budget.limit || (!current?.rewarded && pending >= 3)) throw new DreamImageError("IMAGE_LIMIT", 429);
    tx.set(budget.ref, { count: count + 1 });
    if (!current?.rewarded) tx.set(allowance, { count: pending + 1 }, { merge: true });
    tx.set(job, { state: "working", runId, leaseUntil: now + LEASE_MS }, { merge: true });
    return { state: current?.rewarded ? "working" : "awaiting-ad", text };
  });
  const { text } = claim;
  return {
    state: claim.state,
    work: text ? async () => {
      try {
        const bytes = await generateImage(text, key);
        const thumbnail = await createDreamThumbnail(bytes);
        await db.runTransaction(async tx => {
          const [entry, image] = await tx.getAll(dream, job);
          if (image.data()?.runId !== runId) return;
          dreamText(entry.data());
          const rewarded = image.data()?.rewarded === true;
          if (rewarded && scope === "journal") await publishAutomaticImage(tx, dream, entry.data(), image.data());
          tx.set(asset, { bytes, thumbnail });
          tx.update(job, { state: "saved", leaseUntil: 0 });
          if (rewarded) tx.update(dream, scope === "feed" ? { adminFeedImageReady: true } : { dreamImageReady: true });
        });
      } catch {
        await db.runTransaction(async tx => {
          if ((await tx.get(job)).data()?.runId === runId) tx.update(job, { state: "failed", leaseUntil: 0 });
        }).catch(() => undefined);
      }
    } : null,
  };
}

async function generateImage(text: string, key: string) {
  const subject = `A single scene inspired by the following dream. Interpret intimate or violent details symbolically, with no nudity, injuries, or gore. Do not draw any lettering. Dream: ${text}`;
  const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json", "X-Fal-Store-IO": "0",
      "X-Fal-Object-Lifecycle-Preference": '{"expiration_duration_seconds":600}' },
    body: JSON.stringify({
      prompt: buildGothicImagePrompt(subject), image_size: { width: 704, height: 1248 },
      num_inference_steps: 4, num_images: 1, enable_safety_checker: true, output_format: "jpeg",
    }),
    signal: AbortSignal.timeout(70_000),
  });
  if (!response.ok) throw new Error("Image generation failed");
  const result = await response.json();
  const url = new URL(result.images?.[0]?.url ?? "");
  if (url.protocol !== "https:" || !url.hostname.endsWith(".fal.media") || url.port || url.username || url.password) {
    throw new Error("Invalid image host");
  }
  const image = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: "error" });
  if (!image.ok) throw new Error("Image download failed");
  const bytes = await sharp(Buffer.from(await image.arrayBuffer()), { limitInputPixels: 2_000_000 })
    .resize({ width: 704, height: 1248, fit: "inside" }).webp({ quality: 80 }).toBuffer();
  if (bytes.length > IMAGE_LIMIT_BYTES) throw new Error("Image exceeds storage limit");
  return bytes;
}
