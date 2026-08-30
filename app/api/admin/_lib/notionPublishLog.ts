import { AI_IMAGE_COLLECTION } from "@/lib/adminAiImage";
import { AI_VIDEO_COLLECTION } from "@/lib/adminAiVideo";
import {
  NOTION_KIND_LABEL,
  NOTION_PLATFORM_ORDER,
  NOTION_PROJECT_DREAMLY,
  buildPublishLogEntry,
  calendarCardTitle,
  entriesFromImageDoc,
  entriesFromVideoDoc,
  isStaleGroupedKey,
  notionKindLabel,
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
      title: [
        {
          type: "text" as const,
          text: { content: clip(calendarCardTitle(project, entry.platform, entry.kind), 200) },
        },
      ],
    },
    Проект: { select: { name: project } },
    Тип: { select: { name: notionKindLabel(entry.kind) } },
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
  const text = await response.text();
  const payload = (text ? JSON.parse(text) : {}) as T & { message?: string };
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
        Тип: {
          select: {
            options: [
              { name: NOTION_KIND_LABEL.video, color: "purple" },
              { name: NOTION_KIND_LABEL.image, color: "green" },
            ],
          },
        },
        Ролик: { rich_text: {} },
      },
    }),
  });
}

type NotionView = {
  id?: string;
  name?: string;
  type?: string;
};

type PublishViewSpec = {
  name: string;
  aliases?: string[];
  type: "calendar" | "table";
  filter?: Record<string, unknown> | null;
  sorts?: { property: string; direction: "ascending" | "descending" }[];
};

const PUBLISH_VIEWS: PublishViewSpec[] = [
  { name: "📅 All Content", aliases: ["Календарь", "All Content"], type: "calendar" },
  {
    name: "🌙 Dreamly",
    aliases: ["Dreamly"],
    type: "calendar",
    filter: { property: "Проект", select: { equals: "Dreamly" } },
  },
  {
    name: "💰 CurrencyHub",
    aliases: ["CurrencyHub"],
    type: "calendar",
    filter: { property: "Проект", select: { equals: "CurrencyHub" } },
  },
  {
    name: "📊 Skarim",
    aliases: ["Skarim"],
    type: "calendar",
    filter: { property: "Проект", select: { equals: "Skarim" } },
  },
  {
    name: "🎬 Videos",
    aliases: ["Videos"],
    type: "calendar",
    filter: { property: "Тип", select: { equals: NOTION_KIND_LABEL.video } },
  },
  {
    name: "📝 Posts",
    aliases: ["Posts"],
    type: "calendar",
    filter: { property: "Тип", select: { equals: NOTION_KIND_LABEL.image } },
  },
  {
    name: "✅ Published",
    aliases: ["Published"],
    type: "table",
    filter: { property: "Статус", select: { equals: "Опубликовано" } },
    sorts: [{ property: "Дата", direction: "descending" }],
  },
];

function normalizeViewName(name: string) {
  return name.replace(/^[^\p{L}\p{N}]+/u, "").trim().toLowerCase();
}

function viewMatchesSpec(view: NotionView, spec: PublishViewSpec) {
  const names = [spec.name, ...(spec.aliases || [])].map(normalizeViewName);
  return names.includes(normalizeViewName(view.name || ""));
}

function propertyId(properties: Record<string, { id?: string }> | undefined, name: string) {
  const raw = String(properties?.[name]?.id || "");
  return raw ? decodeURIComponent(raw) : "";
}

async function listDatabaseViews(databaseId: string): Promise<NotionView[]> {
  const listed = await notionFetch<{ results?: { id?: string }[] }>(`/views?database_id=${databaseId}`, {
    method: "GET",
  });
  const views: NotionView[] = [];
  for (const row of listed.results || []) {
    if (!row.id) continue;
    views.push(await notionFetch<NotionView>(`/views/${row.id}`, { method: "GET" }));
  }
  return views;
}

async function ensurePublishViews() {
  const source = await notionFetch<{
    parent?: { database_id?: string };
    properties?: Record<string, { id?: string; name?: string }>;
  }>(`/data_sources/${notionDataSourceId()}`, { method: "GET" });
  const databaseId = String(source.parent?.database_id || "");
  if (!databaseId) return;

  const datePropertyId = propertyId(source.properties, "Дата");
  const views = await listDatabaseViews(databaseId);
  const claimed = new Set<string>();

  for (const spec of PUBLISH_VIEWS) {
    const existing = views.find((view) => view.id && !claimed.has(view.id) && viewMatchesSpec(view, spec));
    if (existing?.id) {
      claimed.add(existing.id);
      const patch: Record<string, unknown> = {};
      if (existing.name !== spec.name) patch.name = spec.name;
      if (spec.filter) patch.filter = spec.filter;
      if (spec.sorts) patch.sorts = spec.sorts;
      if (Object.keys(patch).length === 0) continue;
      await notionFetch(`/views/${existing.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      continue;
    }

    const body: Record<string, unknown> = {
      database_id: databaseId,
      data_source_id: notionDataSourceId(),
      name: spec.name,
      type: spec.type,
    };
    if (spec.filter) body.filter = spec.filter;
    if (spec.sorts) body.sorts = spec.sorts;
    if (spec.type === "calendar") {
      body.configuration = {
        type: "calendar",
        date_property_id: datePropertyId,
        view_range: "month",
        show_weekends: true,
      };
    } else {
      body.configuration = { type: "table" };
    }
    await notionFetch("/views", { method: "POST", body: JSON.stringify(body) });
  }

  const lists = views.filter((view) => view.type === "list" && normalizeViewName(view.name || "") === "список");
  for (const extra of lists.slice(1)) {
    if (!extra.id) continue;
    await notionFetch(`/views/${extra.id}`, { method: "DELETE" });
  }
}

export async function ensureNotionPublishWorkspace() {
  await ensureSchema();
  await ensurePublishViews();
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

const POSITIONER_ORIGIN = "https://positioner-web.vercel.app";
const POSITIONER_RETRY_ATTEMPTS = 3;
const POSITIONER_RETRY_BASE_MS = 400;

function resolvePositionerPublishUrl() {
  const publishUrl = (process.env.POSITIONER_PUBLISH_URL || "").trim();
  if (publishUrl) return publishUrl;
  const origin = (process.env.POSITIONER_URL || POSITIONER_ORIGIN).trim().replace(/\/+$/, "");
  return `${origin}/api/publishes`;
}

function positionerAuthHeaders() {
  const secret = (process.env.POSITIONER_INGEST_SECRET || "").trim();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
    headers["X-Positioner-Key"] = secret;
  }
  return headers;
}

function positionerPublishPayload(entry: SocialPublishLogEntry) {
  return {
    key: entry.key,
    date: dateStart(entry.publishedAt),
    publishedAt: entry.publishedAt,
    project: entry.project,
    platform: entry.platform,
    platforms: [entry.platform],
    format: entry.format,
    status: entry.status,
    title: entry.title,
    ...(entry.url ? { url: entry.url } : {}),
    ...(entry.notes ? { notes: entry.notes } : {}),
    kind: entry.kind,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableNetworkError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || error.name === "TimeoutError" || error.name === "TypeError";
}

export async function trackSocialPublish(entry: SocialPublishLogEntry) {
  return trackSocialPublishes([entry]);
}

// Positioner rewrites its whole publishes file on every request, so parallel
// single-entry posts used to overwrite each other and rows went missing. One
// request per batch is written in a single pass.
export async function trackSocialPublishes(entries: SocialPublishLogEntry[]) {
  const wanted = entries.filter((entry) => entry.status !== "Черновик");
  if (!wanted.length) return "skipped" as const;

  const url = resolvePositionerPublishUrl();
  const headers = positionerAuthHeaders();
  const body = JSON.stringify(
    wanted.length === 1
      ? positionerPublishPayload(wanted[0])
      : { publishes: wanted.map(positionerPublishPayload) },
  );

  for (let attempt = 1; attempt <= POSITIONER_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) return "created" as const;
      if (response.status >= 500 && attempt < POSITIONER_RETRY_ATTEMPTS) {
        await sleep(POSITIONER_RETRY_BASE_MS * 2 ** (attempt - 1));
        continue;
      }
      throw new Error(`positioner ${response.status}`);
    } catch (error) {
      if (isRetryableNetworkError(error) && attempt < POSITIONER_RETRY_ATTEMPTS) {
        await sleep(POSITIONER_RETRY_BASE_MS * 2 ** (attempt - 1));
        continue;
      }
      console.error("[positioner-publish]", wanted.map((item) => item.key).join(","), error);
      return "skipped" as const;
    }
  }

  return "skipped" as const;
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
    await ensureNotionPublishWorkspace();
  } catch (error) {
    console.error("[notion-backfill] could not update Notion schema or views", error);
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
