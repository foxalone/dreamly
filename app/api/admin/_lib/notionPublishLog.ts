import { AI_IMAGE_COLLECTION } from "@/lib/adminAiImage";
import { AI_VIDEO_COLLECTION } from "@/lib/adminAiVideo";
import {
  NOTION_PROJECT_DREAMLY,
  buildPublishLogEntry,
  entriesFromImageDoc,
  entriesFromVideoDoc,
  type SocialAssetKind,
  type SocialPlatform,
  type SocialPublishLogEntry,
  type NotionStatus,
} from "@/lib/socialPublishLog";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";

const NOTION_VERSION = "2026-03-11";
const NOTION_API = "https://api.notion.com/v1";

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

function notionHeaders() {
  return {
    Authorization: `Bearer ${notionToken()}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
}

function pageProperties(entry: SocialPublishLogEntry) {
  return {
    Название: { title: [{ type: "text" as const, text: { content: clip(entry.title, 200) || entry.key } }] },
    Проект: { select: { name: NOTION_PROJECT_DREAMLY } },
    Площадка: { select: { name: entry.platform } },
    Формат: { select: { name: entry.format } },
    Статус: { select: { name: entry.status } },
    Дата: { date: { start: dateStart(entry.publishedAt) } },
    Ссылка: { url: entry.url || null },
    Заметки: { rich_text: entry.notes ? [{ type: "text" as const, text: { content: clip(entry.notes, 1900) } }] : [] },
    Ключ: { rich_text: [{ type: "text" as const, text: { content: clip(entry.key, 200) } }] },
  };
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

async function findPageIdByKey(key: string) {
  const payload = await notionFetch<{ results?: { id?: string }[] }>(`/data_sources/${notionDataSourceId()}/query`, {
    method: "POST",
    body: JSON.stringify({
      page_size: 1,
      filter: { property: "Ключ", rich_text: { equals: key } },
    }),
  });
  return String(payload.results?.[0]?.id || "");
}

export async function upsertNotionPublish(entry: SocialPublishLogEntry): Promise<"created" | "updated" | "skipped"> {
  if (!notionPublishLogConfigured()) return "skipped";

  const properties = pageProperties(entry);
  const existingId = await findPageIdByKey(entry.key);
  if (existingId) {
    await notionFetch(`/pages/${existingId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });
    return "updated";
  }

  await notionFetch("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "data_source_id", data_source_id: notionDataSourceId() },
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
  const created = { videos: 0, images: 0, updated: 0, skipped: 0, failed: 0 };
  if (!notionPublishLogConfigured()) {
    throw new Error("NOTION_API_KEY or NOTION_PUBLISH_DATA_SOURCE_ID is missing");
  }

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
