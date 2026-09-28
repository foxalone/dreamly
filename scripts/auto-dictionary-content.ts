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
import { mintAdminIdToken } from "../app/api/admin/_lib/youtubeRemote";

const PRODUCTION_AUTO_CONTENT_URL = "https://dreamly.art/api/admin/auto-content";

/**
 * `--respace` (preview) / `--respace --apply`: re-time everything booked from tomorrow on
 * to one video + one image a day. Runs in production because only production holds the
 * YouTube credentials. Waits for a deploy that knows `respace` — an older deploy would
 * treat the POST as "enqueue one pair".
 */
async function respaceViaProduction(apply: boolean) {
  const waitUntil = Date.now() + 15 * 60_000;
  for (;;) {
    const token = await mintAdminIdToken();
    const probe = await fetch(PRODUCTION_AUTO_CONTENT_URL, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const payload = (await probe.json().catch(() => ({}))) as { cadence?: { timeZone?: string } };
    if (probe.ok && payload.cadence?.timeZone === "America/New_York") break;
    if (Date.now() > waitUntil) throw new Error("Production still runs the old schedule code — deploy did not arrive in 15 min");
    console.log("waiting for the new deploy on dreamly.art…");
    await new Promise((resolve) => setTimeout(resolve, 20_000));
  }
  for (let round = 1; round <= 4; round += 1) {
    const token = await mintAdminIdToken();
    const response = await fetch(PRODUCTION_AUTO_CONTENT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ respace: true, dryRun: !apply }),
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      lastDay?: string;
      errors?: number;
      youtubeLater?: number;
      moves?: Array<{ from: string; to: string; slug: string; title: string; youtube: string; image: string; imageAt: string; errors: string[] }>;
      strayImages?: Array<{ title: string; scheduledAt: string }>;
    };
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    const et = (iso: string) => iso
      ? new Intl.DateTimeFormat("ru-RU", { timeZone: "America/New_York", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) + " ET"
      : "—";
    console.log(`${apply ? "ПЕРЕНЕСЕНО" : "ПЛАН (ничего не менялось)"}: ${payload.moves?.length ?? 0} видео, по одному в день до ${payload.lastDay || "—"}`);
    for (const move of payload.moves || []) {
      console.log(`  ${et(move.from)} → ${et(move.to)} · ${move.slug || move.title} · YouTube ${move.youtube} · картинка ${move.imageAt ? et(move.imageAt) : "нет"} (${move.image})${move.errors.length ? ` · ОШИБКИ: ${move.errors.join("; ")}` : ""}`);
    }
    if (payload.strayImages?.length) {
      console.log(`  картинки без пары (не тронуты): ${payload.strayImages.map((item) => `${item.title} ${et(item.scheduledAt)}`).join(", ")}`);
    }
    // Fresh YouTube uploads are capped per request; repeat until they are all in.
    if (!apply || !payload.youtubeLater) return payload.errors ? 1 : 0;
    console.log(`YouTube: ещё ${payload.youtubeLater} не загружено — повторяем…`);
  }
  return 1;
}

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
  // `--backfill-images` only books the 19:00 ET image for already-scheduled pairs that have none, then exits.
  if (process.argv.includes("--backfill-images")) {
    const backfill = await backfillAutoPairImages(AUTO_CONTENT_CREATED_BY);
    console.log(JSON.stringify(backfill, null, 2));
    process.exit(backfill.errors ? 1 : 0);
  }
  if (process.argv.includes("--respace")) {
    process.exit(await respaceViaProduction(process.argv.includes("--apply")));
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

  // Pairs booked before the image booking existed have a video slot but no image;
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
    `${(slots.dateKeys || [slots.dateKey]).join(" и ")} · видео 12:00 ET, картинка 19:00 ET`,
    ...results.map((item, index) => {
      const hour = `${slots.slots[index]?.hour ?? "?"}`;
      const youtubeLine = item.youtubeScheduled
        ? "YouTube ок"
        : item.youtubeError
          ? `YouTube: ${item.youtubeError}`
          : "YouTube не ставили";
      const imageLine = item.imageScheduled ? "картинка в соцсети 19:00 ET" : item.imageError ? `картинка: ${item.imageError}` : "";
      return [`${hour}:00 ET · ${item.title} · видео ${item.video.status} · картинка ${item.image.status} · ${youtubeLine}`, imageLine]
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
