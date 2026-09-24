import {
  backfillAutoPairImages,
  enqueueAutoDictionaryContent,
  nextAutoPublishSlots,
  notifyAutoDictionaryContentDone,
  scheduleAutoDictionaryPair,
  waitForAutoDictionaryContent,
} from "../app/api/admin/_lib/autoContent";
import { AUTO_CONTENT_CREATED_BY } from "../lib/adminAutoDictionary";
import { AUTO_PAIR_COUNT } from "../lib/adminAutoSlots";

type Pair = { slug: string; title: string; videoJobId: string; imageJobId: string };

function readFlag(name: string) {
  const prefix = `${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) || "";
}

function parseExistingPairs() {
  return process.argv
    .filter((entry) => entry.startsWith("--pair="))
    .map((entry) => {
      const [slug, videoJobId, imageJobId, title] = entry.slice("--pair=".length).split(":");
      return {
        slug,
        videoJobId,
        imageJobId,
        title: title ? decodeURIComponent(title) : slug,
      } satisfies Pair;
    });
}

async function main() {
  // `--backfill-images` only books the +5h image for already-scheduled pairs that have none, then exits.
  if (process.argv.includes("--backfill-images")) {
    const backfill = await backfillAutoPairImages(AUTO_CONTENT_CREATED_BY);
    console.log(JSON.stringify(backfill, null, 2));
    process.exit(backfill.errors ? 1 : 0);
  }
  const wait = process.argv.includes("--wait");
  const schedule = process.argv.includes("--schedule") || wait;
  const extra = Math.max(0, Number(readFlag("--enqueue-more") || (parseExistingPairs().length ? "0" : String(AUTO_PAIR_COUNT))) || 0);
  const pairs: Pair[] = [...parseExistingPairs()];

  for (let index = 0; index < extra; index += 1) {
    const queued = await enqueueAutoDictionaryContent({
      createdBy: AUTO_CONTENT_CREATED_BY,
      sendToTelegram: true,
      imageProvider: "veo",
    });
    pairs.push({
      slug: queued.entry.slug,
      title: queued.entry.topic,
      videoJobId: queued.videoJobId,
      imageJobId: queued.imageJobId,
    });
  }

  const slots = await nextAutoPublishSlots();
  console.log(JSON.stringify({
    queued: true,
    dateKey: slots.dateKey,
    slots: slots.slots,
    pairs,
  }));
  if (!wait) process.exit(0);

  const results: Array<Pair & {
    ok: boolean;
    video: { status: string; error: string; url: string };
    image: { status: string; error: string; url: string };
    scheduledAt: string;
    youtubeScheduled: boolean;
    youtubeError: string;
    imageScheduled: boolean;
    imageError: string;
  }> = [];
  for (const [index, pair] of pairs.entries()) {
    const result = await waitForAutoDictionaryContent(pair);
    const slot = slots.slots[index];
    const scheduledAt = slot?.publishAt || "";
    let youtubeScheduled = false;
    let youtubeError = "";
    let imageScheduled = false;
    let imageError = "";
    if (schedule && result.ok && slot) {
      const booked = await scheduleAutoDictionaryPair({
        videoJobId: pair.videoJobId,
        imageJobId: pair.imageJobId,
        publishAt: slot.publishAt,
        createdBy: AUTO_CONTENT_CREATED_BY,
      });
      youtubeScheduled = booked.youtubeScheduled;
      youtubeError = booked.youtubeError;
      imageScheduled = booked.imageScheduled;
      imageError = booked.imageError;
    }
    results.push({
      ...pair,
      ok: result.ok && (!schedule || !slot || youtubeScheduled),
      video: result.video,
      image: result.image,
      scheduledAt,
      youtubeScheduled,
      youtubeError,
      imageScheduled,
      imageError,
    });
  }

  // Pairs booked before the +5h image booking existed have a video slot but no image;
  // pick those up every night so a missed image only costs one day, not the whole horizon.
  let backfillLine = "";
  if (schedule) {
    try {
      const backfill = await backfillAutoPairImages(AUTO_CONTENT_CREATED_BY);
      const errors = backfill.items.filter((item) => item.outcome === "error");
      backfillLine = [
        `добронировано картинок: ${backfill.booked}`,
        errors.length ? `ошибки: ${errors.map((item) => `${item.slug} — ${item.error}`).join("; ")}` : "",
      ].filter(Boolean).join(" · ");
    } catch (error) {
      backfillLine = `добронирование картинок: ${error instanceof Error ? error.message : "ошибка"}`;
    }
  }

  const ok = results.every((item) => item.ok);
  const summary = [
    ok ? "Dreamly авто готово" : "Dreamly авто: есть ошибки",
    `${(slots.dateKeys || [slots.dateKey]).join(" и ")} · 05:00 и 15:00 Asia/Jerusalem`,
    ...results.map((item, index) => {
      const hour = slots.slots[index]?.hour ?? "?";
      const youtubeLine = item.youtubeScheduled
        ? "YouTube ок"
        : item.youtubeError
          ? `YouTube: ${item.youtubeError}`
          : "YouTube не ставили";
      const imageLine = item.imageScheduled ? "картинка в соцсети +5ч" : item.imageError ? `картинка: ${item.imageError}` : "";
      return [`${hour}:00 · ${item.title} · видео ${item.video.status} · картинка ${item.image.status} · ${youtubeLine}`, imageLine]
        .filter(Boolean)
        .join(" · ");
    }),
    backfillLine,
  ].filter(Boolean).join("\n");
  await notifyAutoDictionaryContentDone({
    title: summary,
    slug: results[0]?.slug || "",
    video: results[0]?.video || { status: "missing", error: "", url: "" },
    image: results[0]?.image || { status: "missing", error: "", url: "" },
    scheduledAt: "",
  });

  console.log(JSON.stringify({
    done: true,
    ok,
    dateKey: slots.dateKey,
    results,
  }));
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
