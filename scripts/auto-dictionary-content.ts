import {
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
  }> = [];
  for (const [index, pair] of pairs.entries()) {
    const result = await waitForAutoDictionaryContent(pair);
    const slot = slots.slots[index];
    let scheduledAt = slot?.publishAt || "";
    let youtubeScheduled = false;
    let youtubeError = "";
    if (schedule && result.ok && slot) {
      const booked = await scheduleAutoDictionaryPair({
        videoJobId: pair.videoJobId,
        imageJobId: pair.imageJobId,
        publishAt: slot.publishAt,
        createdBy: AUTO_CONTENT_CREATED_BY,
      });
      youtubeScheduled = booked.youtubeScheduled;
      youtubeError = booked.youtubeError;
    }
    results.push({
      ...pair,
      ok: result.ok && (!schedule || !slot || youtubeScheduled),
      video: result.video,
      image: result.image,
      scheduledAt,
      youtubeScheduled,
      youtubeError,
    });
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
      return `${hour}:00 · ${item.title} · видео ${item.video.status} · картинка ${item.image.status} · ${youtubeLine}`;
    }),
  ].join("\n");
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
