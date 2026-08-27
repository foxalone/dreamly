import { AI_IMAGE_COLLECTION } from "@/lib/adminAiImage";
import { AI_VIDEO_COLLECTION } from "@/lib/adminAiVideo";
import {
  NOTION_PLATFORM_EMOJI,
  NOTION_PLATFORM_ORDER,
  NOTION_PROJECT_DREAMLY,
  buildPublishLogEntry,
  entriesFromImageDoc,
  entriesFromVideoDoc,
  isLegacyPlatformKey,
  sortNotionPlatforms,
  titledWithPlatformIcons,
  type NotionFormat,
  type NotionPlatform,
  type NotionStatus,
  type SocialAssetKind,
  type SocialPlatform,
  type SocialPublishLogEntry,
} from "@/lib/socialPublishLog";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";

const NOTION_VERSION = "2026-03-11";
const NOTION_API = "https://api.notion.com/v1";

const PLATFORM_OPTIONS = NOTION_PLATFORM_ORDER.map((name) => ({
  name,
  color:
    name === "YouTube"
      ? "red"
      : name === "TikTok"
        ? "pink"
        : name === "Instagram"
          ? "orange"
          : name === "Facebook"
            ? "blue"
            : name === "Threads"
              ? "gray"
              : "red",
}));

function notionToken() {
  return (process.env.NOTION_API_KEY || "").trim();
}

function notionDataSourceId() {
  return (process.env.NOTION_PUBLISH_DATA_SOURCE_ID || "").trim();
}

export function notionPublishLogConfigured() {
  return Boolean(notionToken() && notionDataSourceId());
}

function clip(value: string, max: number) {
  return value.trim().slice(0, max);
}

function dateStart(iso: string) {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return iso.slice(0, 10);
  return new Date(parsed).toISOString();
}

function earlierIso(left: string, right: string) {
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  if (!Number.isFinite(leftMs)) return right;
  if (!Number.isFinite(rightMs)) return left;
  return leftMs <= rightMs ? left : right;
}

function notionHeaders() {
  return {
    Authorization: `Bearer ${notionToken()}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
}

function pageProperties(entry: SocialPublishLogEntry) {
  const platforms = sortNotionPlatforms(entry.platforms);
  return {
    Название: {
      title: [
        {
          type: "text" as const,
          text: { content: clip(titledWithPlatformIcons(entry.title, platforms), 200) || entry.key },
        },
      ],
    },
    Проект: { select: { name: NOTION_PROJECT_DREAMLY } },
    Площадка: { multi_select: platforms.map((name) => ({ name })) },
    ...(entry.formats[0] ? { Формат: { select: { name: entry.formats[0] } } } : {}),
    Статус: { select: { name: entry.status } },
    Дата: { date: { start: dateStart(entry.publishedAt) } },
    Ссылка: { url: entry.url || null },
    Заметки: { rich_text: entry.notes ? [{ type: "text" as const, text: { content: clip(entry.notes, 1900) } }] : [] },
    Ключ: { rich_text: [{ type: "text" as const, text: { content: clip(entry.key, 200) } }] },
  };
}

function pageIcon(platforms: NotionPlatform[]) {
  const [first] = sortNotionPlatforms(platforms);
  return { type: "emoji" as const, emoji: first ? NOTION_PLATFORM_EMOJI[first] : "📅" };
}

async function notionFetch<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: { ...notionHeaders(), ...(init.headers || {}) },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) {
    throw new Error(payload.message || `Notion ${response.status}`);
  }
  return payload;
}

type NotionPage = {
  id?: string;
  properties?: {
    Название?: { title?: { plain_text?: string }[] };
    Площадка?: { type?: string; select?: { name?: string } | null; multi_select?: { name?: string }[] };
    Формат?: { select?: { name?: string } | null };
    Статус?: { select?: { name?: string } | null };
    Дата?: { date?: { start?: string } | null };
    Ссылка?: { url?: string | null };
    Ключ?: { rich_text?: { plain_text?: string }[] };
  };
};

function plainText(items: { plain_text?: string }[] | undefined) {
  return (items || []).map((item) => String(item.plain_text || "")).join("").trim();
}

function platformsFromPage(page: NotionPage): NotionPlatform[] {
  const property = page.properties?.Площадка;
  const names = property?.multi_select?.map((item) => item.name) || (property?.select?.name ? [property.select.name] : []);
  return sortNotionPlatforms(names.filter((name): name is NotionPlatform => NOTION_PLATFORM_ORDER.includes(name as NotionPlatform)));
}

function entryFromPage(page: NotionPage, fallback: SocialPublishLogEntry): SocialPublishLogEntry {
  const title = titledWithPlatformIcons(plainText(page.properties?.Название?.title) || fallback.title, []);
  return {
    ...fallback,
    title: title || fallback.title,
    platforms: sortNotionPlatforms([...platformsFromPage(page), ...fallback.platforms]),
    formats: [...new Set([...(page.properties?.Формат?.select?.name ? [page.properties.Формат.select.name as NotionFormat] : []), ...fallback.formats])],
    status: (page.properties?.Статус?.select?.name as NotionStatus) || fallback.status,
    publishedAt: earlierIso(page.properties?.Дата?.date?.start || fallback.publishedAt, fallback.publishedAt),
    url: fallback.url || page.properties?.Ссылка?.url || "",
  };
}

async function findPageByKey(key: string): Promise<NotionPage | null> {
  const payload = await notionFetch<{ results?: NotionPage[] }>(`/data_sources/${notionDataSourceId()}/query`, {
    method: "POST",
    body: JSON.stringify({
      page_size: 1,
      filter: { property: "Ключ", rich_text: { equals: key } },
    }),
  });
  return payload.results?.[0] || null;
}

async function ensurePlatformProperty() {
  await notionFetch(`/data_sources/${notionDataSourceId()}`, {
    method: "PATCH",
    body: JSON.stringify({
      properties: {
        Площадка: { multi_select: { options: PLATFORM_OPTIONS } },
      },
    }),
  });
}

async function trashLegacyPages() {
  let cursor: string | undefined;
  let trashed = 0;
  for (;;) {
    const payload = await notionFetch<{ results?: NotionPage[]; has_more?: boolean; next_cursor?: string | null }>(
      `/data_sources/${notionDataSourceId()}/query`,
      {
        method: "POST",
        body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
      },
    );
    for (const page of payload.results || []) {
      const key = plainText(page.properties?.Ключ?.rich_text);
      if (!page.id || !isLegacyPlatformKey(key)) continue;
      await notionFetch(`/pages/${page.id}`, {
        method: "PATCH",
        body: JSON.stringify({ in_trash: true }),
      });
      trashed += 1;
    }
    if (!payload.has_more || !payload.next_cursor) break;
    cursor = payload.next_cursor;
  }
  return trashed;
}

export async function upsertNotionPublish(entry: SocialPublishLogEntry): Promise<"created" | "updated" | "skipped"> {
  if (!notionPublishLogConfigured()) return "skipped";
  if (!entry.platforms.length) return "skipped";

  const existing = await findPageByKey(entry.key);
  const merged = existing ? entryFromPage(existing, entry) : entry;
  const properties = pageProperties(merged);
  const icon = pageIcon(merged.platforms);

  if (existing?.id) {
    await notionFetch(`/pages/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties, icon }),
    });
    return "updated";
  }

  await notionFetch("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "data_source_id", data_source_id: notionDataSourceId() },
      icon,
      properties,
    }),
  });
  return "created";
}

export async function trackSocialPublish(entry: SocialPublishLogEntry) {
  try {
    return await upsertNotionPublish(entry);
  } catch (error) {
    console.error("[notion-publish]", entry.key, error);
    return "skipped" as const;
  }
}

export async function trackDreamlyPublish(input: {
  kind: SocialAssetKind;
  assetId: string;
  platform: SocialPlatform;
  title: string;
  publishedAt: string;
  status?: NotionStatus;
  url?: string;
  notes?: string;
}) {
  return trackSocialPublish(buildPublishLogEntry(input));
}

async function loadAllDocs(collection: string) {
  const docs: { id: string; data: Record<string, unknown> }[] = [];
  let cursor: QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = adminDb().collection(collection).orderBy("__name__").limit(200);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    for (const doc of snapshot.docs) {
      docs.push({ id: doc.id, data: doc.data() as Record<string, unknown> });
    }
    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < 200) break;
  }
  return docs;
}

export async function backfillNotionPublishes() {
  const created = { videos: 0, images: 0, updated: 0, skipped: 0, failed: 0, trashed: 0 };
  if (!notionPublishLogConfigured()) {
    throw new Error("NOTION_API_KEY or NOTION_PUBLISH_DATA_SOURCE_ID is missing");
  }

  try {
    await ensurePlatformProperty();
  } catch (error) {
    console.error("[notion-backfill] could not convert Площадка to multi_select", error);
  }
  created.trashed = await trashLegacyPages();

  const [freeJobs, aiJobs, images] = await Promise.all([
    loadAllDocs("adminVideoJobs"),
    loadAllDocs(AI_VIDEO_COLLECTION),
    loadAllDocs(AI_IMAGE_COLLECTION),
  ]);

  const entries: SocialPublishLogEntry[] = [];
  for (const job of freeJobs) entries.push(...entriesFromVideoDoc(`free:${job.id}`, job.data));
  for (const job of aiJobs) entries.push(...entriesFromVideoDoc(`ai:${job.id}`, job.data));
  for (const job of images) entries.push(...entriesFromImageDoc(job.id, job.data));

  for (const entry of entries) {
    try {
      const result = await upsertNotionPublish(entry);
      if (result === "created") {
        if (entry.notes.startsWith("image ")) created.images += 1;
        else created.videos += 1;
      } else if (result === "updated") created.updated += 1;
      else created.skipped += 1;
    } catch (error) {
      created.failed += 1;
      console.error("[notion-backfill]", entry.key, error);
    }
  }

  return { total: entries.length, ...created };
}
