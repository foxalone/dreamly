import * as functions from "firebase-functions/v1";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

const WELCOME_CREDITS = 10;

function emailInitials(email?: string | null) {
  const e = (email ?? "").trim();
  if (!e) return "U";
  const left = e.split("@")[0] ?? "";
  const parts = left.split(/[._\-+]/).filter(Boolean);
  const a = (parts[0]?.[0] ?? left[0] ?? "U").toUpperCase();
  const b = (parts[1]?.[0] ?? left[1] ?? "").toUpperCase();
  return (a + b) || a;
}

export const grantWelcomeCredits = functions
  .region("europe-west1")
  .auth.user()
  .onCreate(async (user) => {
    const userRef = db.doc(`users/${user.uid}`);
    const ledgerRef = userRef.collection("creditLedger").doc("welcome_bonus");

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);

      // Если профиль уже создан клиентом — просто убедимся, что бонус выдан
      if (snap.exists) {
        const data = snap.data() || {};

        // Уже выдавали — выходим
        if (data.welcomeBonusGranted) return;

        // Выдаём бонус, не затирая существующие данные/кредиты
        tx.update(userRef, {
          // если credits отсутствует, increment всё равно корректно выставит число
          credits: FieldValue.increment(WELCOME_CREDITS),
          welcomeBonusGranted: true,
          // можно обновить initials, если хочешь (не обязательно)
          initials: data.initials ?? emailInitials(user.email),
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Делаем ledger запись 1 раз (фиксированный id)
        tx.set(ledgerRef, {
          type: "welcome_bonus",
          delta: WELCOME_CREDITS,
          createdAt: FieldValue.serverTimestamp(),
        });

        return;
      }

      // Если профиля ещё нет — создаём сразу с бонусом
      tx.set(userRef, {
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
        initials: emailInitials(user.email),

        credits: WELCOME_CREDITS,
        welcomeBonusGranted: true,

        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(ledgerRef, {
        type: "welcome_bonus",
        delta: WELCOME_CREDITS,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  });

// Отложенная публикация в соцсети.
//
// YouTube держит запланированную загрузку сам (status.publishAt), а у TikTok,
// Instagram, Facebook, Threads и Pinterest нативного планирования нет. Их
// очередь лежит в Firestore (socialScheduledAt на документе видео), а этот
// планировщик каждые 5 минут дергает /api/cron/social-publish, который и
// публикует всё, чьё время уже наступило.
const socialPublishCronSecret = defineSecret("SOCIAL_PUBLISH_CRON_SECRET");
const socialPublishEndpoint = defineSecret("SOCIAL_PUBLISH_ENDPOINT");

export const socialPublishTick = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Asia/Jerusalem",
    region: "europe-west1",
    timeoutSeconds: 300,
    secrets: [socialPublishCronSecret, socialPublishEndpoint],
    retryCount: 0,
  },
  async () => {
    const secret = socialPublishCronSecret.value().trim();
    const url = socialPublishEndpoint.value().trim() || "https://dreamly.art/api/cron/social-publish";
    if (!secret) throw new Error("SOCIAL_PUBLISH_CRON_SECRET is empty");
    const startedAt = Date.now();
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
    } catch (error) {
      throw error;
    }
    const text = await response.text();
    if (!response.ok) {
      // Бросаем, чтобы неудачный запуск был виден в логах функции.
      throw new Error(`social-publish ${response.status}: ${text.slice(0, 300)}`);
    }
    console.log("socialPublishTick complete", {
      status: response.status,
      durationMs: Date.now() - startedAt,
      body: text.slice(0, 1_000),
    });
  },
);
