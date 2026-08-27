import { AI_IMAGE_COLLECTION } from "@/lib/adminAiImage";
import { AI_VIDEO_COLLECTION } from "@/lib/adminAiVideo";
import {
  NOTION_PLATFORM_ORDER,
  NOTION_PROJECT_DREAMLY,
  buildPublishLogEntry,
  calendarCardTitle,
  entriesFromImageDoc,
  entriesFromVideoDoc,
  isStaleGroupedKey,
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
  return new Date(parsed).toISOString().slice(0, 10);
}

function notionHeaders() {
  return {
    Authorization: `Bearer ${notionToken()}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
}

function pageProperties(entry: SocialPublishLogEntry) {
  const project = entry.project || NOTION_PROJECT_DREAMLY;
  return {
    Название: {
      title: [{ type: "text" as const, text: { content: clip(calendarCardTitle(project, entry.platform), 200) } }],
    },
    Проект: { select: { name: project } },
    Площадка: { multi_select: [{ name: entry.platform }] },
    Формат: { select: { name: entry.format } },
    Статус: { select: { name: entry.status } },
    Дата: { date: { start: dateStart(entry.publishedAt) } },
    Ссылка: { url: entry.url || null },
    Ролик: { rich_text: entry.title ? [{ type: "text" as const, text: { content: clip(entry.title, 1900) } }] : [] },
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

type NotionPage = {
  id?: string;
  properties?: {
    Ключ?: { rich_text?: { plain_text?: string }[] };
  };
};

function plainText(items: { plain_text?: string }[] | undefined) {
  return (items || []).map((item) => String(item.plain_text || "")).join("").trim();
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

async function ensureSchema() {
  await notionFetch(`/data_sources/${notionDataSourceId()}`, {
    method: "PATCH",
    body: JSON.stringify({
      properties: {
        Площадка: { multi_select: { options: PLATFORM_OPTIONS } },
        Ролик: { rich_text: {} },
      },
    }),
  });
}

async function ensureListView() {
  const source = await notionFetch<{
    parent?: { database_id?: string };
    properties?: Record<string, { id?: string; name?: string }>;
  }>(`/data_sources/${notionDataSourceId()}`, { method: "GET" });
  const databaseId = String(source.parent?.database_id || "");
  if (!databaseId) return;

  const listed = await notionFetch<{ results?: { id?: string; name?: string; type?: string }[] }>(
    `/views?database_id=${databaseId}`,
    { method: "GET" },
  );
  if ((listed.results || []).some((view) => view.type === "list" || view.name === "Список")) return;

  const propertyIds = Object.values(source.properties || {})
    .filter((property) => property.id && property.name !== "Ключ")
    .map((property) => ({ property_id: property.id, visible: property.name !== "Заметки" }));

  await notionFetch("/views", {
    method: "POST",
    body: JSON.stringify({
      database_id: databaseId,
      data_source_id: notionDataSourceId(),
      name: "Список",
      type: "list",
      sorts: [{ property: "Дата", direction: "descending" }],
      configuration: {
        type: "list",
        properties: propertyIds,
      },
    }),
  });
}

async function trashStaleGroupedPages() {
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
      if (!page.id || !isStaleGroupedKey(key)) continue;
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

  const properties = pageProperties(entry);
  const existing = await findPageByKey(entry.key);
  const body = { properties, icon: null };

  if (existing?.id) {
    await notionFetch(`/pages/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return "updated";
  }

  await notionFetch("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "data_source_id", data_source_id: notionDataSourceId() },
      ...body,
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
    await ensureSchema();
  } catch (error) {
    console.error("[notion-backfill] could not update Notion schema", error);
  }
  try {
    await ensureListView();
  } catch (error) {
    console.error("[notion-backfill] could not create Список view", error);
  }
  created.trashed = await trashStaleGroupedPages();

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
