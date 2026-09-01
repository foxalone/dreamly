"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import type { AdminImageLibraryItem, AdminImagePublishPlatform } from "@/lib/adminImageLibrary";
import type { MetaConnectionStatus } from "@/lib/adminMeta";
import type { ThreadsConnectionStatus } from "@/lib/adminThreads";
import {
  pinterestPinUrl,
  SHOW_PINTEREST_PUBLISH_ERRORS,
  type PinterestConnectionStatus,
} from "@/lib/adminPinterest";

type ImagePlatform = AdminImagePublishPlatform;
type MetaStatus = MetaConnectionStatus & { redirectUri?: string };
type ThreadsStatus = ThreadsConnectionStatus & { redirectUri?: string };
type PinterestStatus = PinterestConnectionStatus & { redirectUri?: string };

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.1" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.05" fill="currentColor" />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M14.5 8.5V6.8c0-.7.5-1.3 1.5-1.3h1.3V3h-2.2C12.4 3 11 4.6 11 6.8v1.7H9v2.6h2V21h3.2v-9.9h2.2l.4-2.6h-2.6Z" />
    </svg>
  );
}

function ThreadsGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M12.2 21c-3 0-5.2-1-6.6-2.9C4.3 16.4 3.6 14.1 3.6 11.3v-.1c0-2.8.7-5.1 2-6.8C7 2.5 9.2 1.5 12.2 1.5c2.2 0 4 .5 5.4 1.6 1.2 1 2.1 2.3 2.6 4l-2 .6c-.8-2.7-2.7-4-5.9-4-2.3 0-4 .8-5 2.3-.9 1.4-1.4 3.2-1.4 5.4 0 2.2.5 4 1.4 5.4 1 1.5 2.7 2.3 5 2.3 2 0 3.4-.5 4.3-1.4.8-.8 1.2-1.7 1.2-2.7 0-.9-.3-1.6-1-2.2-.3-.3-.7-.5-1.1-.7-.2 1.4-.7 2.5-1.4 3.2-.8.9-2 1.3-3.4 1.3-1.1 0-2-.3-2.7-.9-.8-.6-1.2-1.5-1.2-2.5 0-1.1.5-2 1.4-2.6.9-.6 2.1-.9 3.6-.9.6 0 1.2 0 1.8.1 0-.7-.2-1.3-.6-1.7-.4-.4-1-.6-1.8-.6-1.1 0-1.9.4-2.4 1.3l-1.8-1c.9-1.5 2.3-2.2 4.2-2.2 1.4 0 2.5.4 3.3 1.2.7.8 1.1 1.8 1.2 3.2 2.1.9 3.2 2.5 3.2 4.7 0 1.6-.6 3-1.8 4.2C16.9 20.3 14.9 21 12.2 21Zm.4-9.1c-1 0-1.8.2-2.3.5-.5.3-.7.7-.7 1.2 0 .4.2.8.5 1 .3.3.8.4 1.3.4.8 0 1.4-.2 1.8-.7.4-.5.7-1.2.8-2.2-.5-.1-1-.2-1.4-.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PinterestGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.6 1.3 1.4 0 .9-.5 2.2-.8 3.4-.3 1 .5 1.9 1.5 1.9 1.8 0 3.2-1.9 3.2-4.7 0-2.4-1.8-4.1-4.3-4.1a4.5 4.5 0 0 0-4.7 4.5c0 .9.3 1.8.8 2.3.1.1.1.2.1.3l-.3 1.1c0 .2-.1.2-.3.1-1.3-.6-2-2.4-2-3.9 0-3.2 2.3-6.1 6.7-6.1 3.5 0 6.2 2.5 6.2 5.8 0 3.5-2.2 6.3-5.2 6.3-1 0-2-.5-2.3-1.2l-.6 2.4c-.2.9-.8 2-1.2 2.6A10 10 0 1 0 12 2Z" />
    </svg>
  );
}

function platformLabel(platform: ImagePlatform) {
  if (platform === "instagram") return "Instagram";
  if (platform === "threads") return "Threads";
  if (platform === "pinterest") return "Pinterest";
  return "Facebook";
}

function PublishIconButton({
  platform,
  published,
  failed = false,
  failureNote = "",
  openHint = "",
  disabled,
  busy,
  onClick,
}: {
  platform: ImagePlatform;
  published: boolean;
  failed?: boolean;
  failureNote?: string;
  openHint?: string;
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const label = published
    ? `Уже в ${platformLabel(platform)}${openHint ? ` · ${openHint}` : ""}`
    : failed
      ? `Ошибка публикации в ${platformLabel(platform)}${failureNote ? `: ${failureNote}` : ""} · нажмите, чтобы повторить`
      : `Опубликовать в ${platformLabel(platform)}`;
  const color =
    platform === "instagram"
      ? "text-pink-600 hover:bg-gradient-to-br hover:from-yellow-400 hover:via-pink-500 hover:to-purple-600 hover:text-white"
      : platform === "threads"
        ? "text-[var(--text)] hover:bg-black hover:text-white"
        : platform === "pinterest"
          ? "text-[#E60023] hover:bg-[#E60023] hover:text-white"
          : "text-[#1877F2] hover:bg-[#1877F2] hover:text-white";
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled || busy}
      onClick={onClick}
      className={`relative flex h-7 w-7 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-35 ${
        published
          ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-600"
          : failed
            ? "border-red-500/70 bg-red-500/10 text-red-500"
            : `border-[var(--border)] bg-[var(--card)] ${color}`
      }`}
    >
      {busy ? (
        <span className="text-[10px] font-bold">…</span>
      ) : platform === "instagram" ? (
        <InstagramGlyph />
      ) : platform === "threads" ? (
        <ThreadsGlyph />
      ) : platform === "pinterest" ? (
        <PinterestGlyph />
      ) : (
        <FacebookGlyph />
      )}
      {published && !busy ? <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500" /> : null}
    </button>
  );
}

function ImageTile({
  item,
  dateLabel,
  costLabel,
  busyDownload,
  actions,
  onDownload,
}: {
  item: AdminImageLibraryItem;
  dateLabel: string;
  costLabel: string;
  busyDownload: boolean;
  actions: ReactNode;
  onDownload: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)]">
      <div className="relative aspect-square overflow-hidden bg-[color-mix(in_srgb,var(--text)_8%,transparent)]">
        <a href={item.imageUrl} target="_blank" rel="noreferrer" title={item.subject || item.prompt} className="group absolute inset-0 block">
          <img src={item.imageUrl} alt={item.subject || item.prompt} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        </a>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />
        {dateLabel ? (
          <p className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-[2px]">
            {dateLabel}
          </p>
        ) : null}
        <p className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-[2px]">
          {item.sourceLabel}
        </p>
        <div className="absolute inset-x-0 bottom-0 z-10 px-1 pb-1.5 pt-8">
          <div className="rounded-lg bg-black/35 px-1 py-1 backdrop-blur-[2px]">
            <div className="flex items-center justify-between gap-1 px-1">
              <p className="min-w-0 truncate text-[10px] font-semibold text-white/90" title={item.pageUrl}>
                {costLabel}
              </p>
              <button
                type="button"
                disabled={busyDownload}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onDownload();
                }}
                className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-black disabled:opacity-50"
              >
                {busyDownload ? "…" : "Скачать"}
              </button>
            </div>
            <div className="mt-1 flex items-center gap-0.5">{actions}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ImageLibraryPanel({ user }: { user: User }) {
  const [items, setItems] = useState<AdminImageLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = useState("");
  const [meta, setMeta] = useState<MetaStatus | null>(null);
  const [threads, setThreads] = useState<ThreadsStatus | null>(null);
  const [pinterest, setPinterest] = useState<PinterestStatus | null>(null);
  const [publishingKey, setPublishingKey] = useState("");
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }), []);
  const usd = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 }),
    [],
  );

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [libraryResponse, metaResponse, threadsResponse, pinterestResponse] = await Promise.all([
        fetch("/api/admin/image-library", { headers, cache: "no-store" }),
        fetch("/api/admin/meta/status", { headers, cache: "no-store" }),
        fetch("/api/admin/threads/status", { headers, cache: "no-store" }),
        fetch("/api/admin/pinterest/status", { headers, cache: "no-store" }),
      ]);
      const payload = (await libraryResponse.json()) as { items?: AdminImageLibraryItem[]; error?: string };
      if (!libraryResponse.ok) throw new Error(payload.error || "Не удалось загрузить библиотеку");
      setItems(payload.items ?? []);
      const metaPayload = (await metaResponse.json()) as MetaStatus & { error?: string };
      if (metaResponse.ok) setMeta(metaPayload);
      const threadsPayload = (await threadsResponse.json()) as ThreadsStatus & { error?: string };
      if (threadsResponse.ok) setThreads(threadsPayload);
      const pinterestPayload = (await pinterestResponse.json()) as PinterestStatus & { error?: string };
      if (pinterestResponse.ok) setPinterest(pinterestPayload);
      setError("");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Ошибка загрузки";
      if (!quiet) setError(message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (!publishingKey) void load(true);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [load, publishingKey]);

  function markPublished(itemId: string, platform: ImagePlatform, extra: Partial<AdminImageLibraryItem> = {}) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              published: {
                instagram: Boolean(item.published?.instagram),
                facebook: Boolean(item.published?.facebook),
                threads: Boolean(item.published?.threads),
                pinterest: Boolean(item.published?.pinterest),
                [platform]: true,
              },
              ...(platform === "threads" ? { threadsState: "published" as const, threadsError: "" } : {}),
              ...(platform === "pinterest" ? { pinterestState: "published" as const, pinterestError: "" } : {}),
              ...extra,
            }
          : item,
      ),
    );
  }

  async function download(item: AdminImageLibraryItem) {
    setBusyId(item.id);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/ai-image/${encodeURIComponent(item.id)}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Не удалось скачать изображение");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const disposition = response.headers.get("Content-Disposition") || "";
      const matched = /filename="([^"]+)"/i.exec(disposition);
      const filename = matched?.[1] || `${item.id}.jpg`;
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (caught) {
      setNotice({ type: "error", text: caught instanceof Error ? caught.message : "Ошибка скачивания" });
    } finally {
      setBusyId("");
    }
  }

  function cardBusy(itemId: string) {
    return publishingKey.endsWith(`:${itemId}`);
  }

  function pendingPlatforms(item: AdminImageLibraryItem): ImagePlatform[] {
    const pending: ImagePlatform[] = [];
    if (meta?.instagramReady && !item.published?.instagram) pending.push("instagram");
    if (meta?.facebookReady && !item.published?.facebook) pending.push("facebook");
    if (threads?.connected && !item.published?.threads && item.threadsState !== "publishing") pending.push("threads");
    if (pinterest?.connected && !item.published?.pinterest && item.pinterestState !== "publishing") pending.push("pinterest");
    return pending;
  }

  async function publishImageTo(item: AdminImageLibraryItem, platform: ImagePlatform) {
    const token = await user.getIdToken();
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    if (platform === "instagram" || platform === "facebook") {
      const response = await fetch("/api/admin/meta/publish-image", {
        method: "POST",
        headers,
        body: JSON.stringify({ libraryId: item.id, target: platform }),
      });
      const payload = (await response.json()) as { ok?: boolean; status?: string; pageUrl?: string; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `Не удалось опубликовать в ${platformLabel(platform)}`);
      }
      markPublished(item.id, platform);
      return { pageUrl: payload.pageUrl || "", detail: payload.status || "PUBLISHED" };
    }
    if (platform === "threads") {
      const response = await fetch("/api/admin/threads/publish-image", {
        method: "POST",
        headers,
        body: JSON.stringify({ libraryId: item.id }),
      });
      const payload = (await response.json()) as { ok?: boolean; status?: string; pageUrl?: string; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Не удалось опубликовать в Threads");
      }
      markPublished(item.id, "threads");
      return { pageUrl: payload.pageUrl || "", detail: payload.status || "PUBLISHED" };
    }
    const response = await fetch("/api/admin/pinterest/publish-image", {
      method: "POST",
      headers,
      body: JSON.stringify({ libraryId: item.id }),
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      status?: string;
      pinId?: string;
      boardName?: string;
      pageUrl?: string;
      error?: string;
    };
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Не удалось опубликовать в Pinterest");
    }
    markPublished(item.id, "pinterest", { pinterestPinId: payload.pinId || "" });
    return {
      pageUrl: payload.pageUrl || "",
      detail: `${payload.status || "PUBLISHED"}${payload.boardName ? ` · доска «${payload.boardName}»` : ""}`,
    };
  }

  async function publishToMeta(item: AdminImageLibraryItem, target: "instagram" | "facebook") {
    if (item.published?.[target] || cardBusy(item.id)) return;
    setPublishingKey(`${target}:${item.id}`);
    setNotice(null);
    try {
      const result = await publishImageTo(item, target);
      setNotice({
        type: "ok",
        text: `Опубликовано в ${platformLabel(target)} · ${result.detail}${result.pageUrl ? ` · ${result.pageUrl}` : ""}`,
      });
    } catch (publishError) {
      setNotice({ type: "error", text: publishError instanceof Error ? publishError.message : "Ошибка публикации" });
      await load(true);
    } finally {
      setPublishingKey("");
    }
  }

  async function publishToThreads(item: AdminImageLibraryItem) {
    if (item.published?.threads || cardBusy(item.id)) return;
    setPublishingKey(`threads:${item.id}`);
    setNotice(null);
    try {
      const result = await publishImageTo(item, "threads");
      setNotice({
        type: "ok",
        text: `Опубликовано в Threads · ${result.detail}${result.pageUrl ? ` · ${result.pageUrl}` : ""}`,
      });
    } catch (publishError) {
      setNotice({ type: "error", text: publishError instanceof Error ? publishError.message : "Ошибка публикации" });
      await load(true);
    } finally {
      setPublishingKey("");
    }
  }

  async function publishToPinterest(item: AdminImageLibraryItem) {
    if (item.published?.pinterest) {
      if (item.pinterestPinId) window.open(pinterestPinUrl(item.pinterestPinId), "_blank", "noopener,noreferrer");
      return;
    }
    if (cardBusy(item.id)) return;
    setPublishingKey(`pinterest:${item.id}`);
    setNotice(null);
    try {
      const result = await publishImageTo(item, "pinterest");
      setNotice({
        type: "ok",
        text: `Опубликовано в Pinterest · ${result.detail}${result.pageUrl ? ` · ${result.pageUrl}` : ""}`,
      });
      await load(true);
    } catch (publishError) {
      if (SHOW_PINTEREST_PUBLISH_ERRORS) {
        setNotice({ type: "error", text: publishError instanceof Error ? publishError.message : "Ошибка публикации" });
      }
      await load(true);
    } finally {
      setPublishingKey("");
    }
  }

  async function publishToAll(item: AdminImageLibraryItem) {
    const targets = pendingPlatforms(item);
    if (!targets.length || cardBusy(item.id)) return;
    setNotice(null);
    const ok: string[] = [];
    const failed: string[] = [];
    let pageUrl = item.pageUrl || "";
    for (const platform of targets) {
      setPublishingKey(`${platform}:${item.id}`);
      try {
        const result = await publishImageTo(item, platform);
        ok.push(platformLabel(platform));
        if (result.pageUrl) pageUrl = result.pageUrl;
      } catch (publishError) {
        if (SHOW_PINTEREST_PUBLISH_ERRORS || platform !== "pinterest") {
          failed.push(
            `${platformLabel(platform)}: ${publishError instanceof Error ? publishError.message : "ошибка"}`,
          );
        }
      }
    }
    setPublishingKey("");
    await load(true);
    if (!failed.length) {
      setNotice(
        ok.length
          ? {
              type: "ok",
              text: `Опубликовано: ${ok.join(", ")}${pageUrl ? ` · ${pageUrl}` : ""}`,
            }
          : null,
      );
      return;
    }
    setNotice({
      type: "error",
      text: ok.length
        ? `Опубликовано: ${ok.join(", ")}. Ошибки — ${failed.join("; ")}`
        : failed.join("; "),
    });
  }

  const publishActions = (item: AdminImageLibraryItem) => {
    const busy = cardBusy(item.id);
    const remaining = pendingPlatforms(item);
    return (
      <>
        <PublishIconButton
          platform="instagram"
          published={Boolean(item.published?.instagram)}
          disabled={!meta?.instagramReady || busy}
          busy={publishingKey === `instagram:${item.id}`}
          onClick={() => void publishToMeta(item, "instagram")}
        />
        <PublishIconButton
          platform="facebook"
          published={Boolean(item.published?.facebook)}
          disabled={!meta?.facebookReady || busy}
          busy={publishingKey === `facebook:${item.id}`}
          onClick={() => void publishToMeta(item, "facebook")}
        />
        <PublishIconButton
          platform="threads"
          published={Boolean(item.published?.threads)}
          failed={item.threadsState === "failed"}
          failureNote={item.threadsError}
          disabled={!threads?.connected || item.threadsState === "publishing" || busy}
          busy={publishingKey === `threads:${item.id}` || item.threadsState === "publishing"}
          onClick={() => void publishToThreads(item)}
        />
        <PublishIconButton
          platform="pinterest"
          published={Boolean(item.published?.pinterest)}
          failed={SHOW_PINTEREST_PUBLISH_ERRORS && item.pinterestState === "failed"}
          failureNote={SHOW_PINTEREST_PUBLISH_ERRORS ? item.pinterestError : ""}
          openHint={item.published?.pinterest && item.pinterestPinId ? "открыть пин" : ""}
          disabled={
            busy ||
            item.pinterestState === "publishing" ||
            (!pinterest?.connected && !item.published?.pinterest) ||
            (Boolean(item.published?.pinterest) && !item.pinterestPinId)
          }
          busy={publishingKey === `pinterest:${item.id}` || item.pinterestState === "publishing"}
          onClick={() => void publishToPinterest(item)}
        />
        <button
          type="button"
          title={
            remaining.length
              ? `Опубликовать во все доступные: ${remaining.map(platformLabel).join(", ")}`
              : "Уже опубликовано во все доступные сети"
          }
          aria-label="Опубликовать во все доступные сети"
          disabled={!remaining.length || busy}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void publishToAll(item);
          }}
          className="ml-auto shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-black disabled:cursor-not-allowed disabled:opacity-35"
        >
          {busy ? "…" : "All"}
        </button>
      </>
    );
  };

  return (
    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-500">Image library</p>
          <h2 className="mt-1 text-2xl font-bold text-[var(--text)]">Все сгенерированные картинки</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Sora · Veo · {items.length} готовых · публикация в Instagram, Facebook, Threads и Pinterest
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="text-sm font-semibold text-[var(--muted)] underline">
          Обновить
        </button>
      </div>

      {notice && (
        <p className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${notice.type === "ok" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
          {notice.text}
        </p>
      )}
      {error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">{error}</p>}

      {loading ? (
        <div className="mt-6 grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="aspect-square animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--text)_8%,transparent)]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
          Готовых картинок пока нет.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-5 gap-2">
          {items.map((item) => (
            <ImageTile
              key={item.id}
              item={item}
              dateLabel={dateFormatter.format(new Date(item.createdAt))}
              costLabel={item.actualCostUsd == null ? `оценка ${usd.format(item.estimatedCostUsd)}` : `≈ ${usd.format(item.actualCostUsd)}`}
              busyDownload={busyId === item.id}
              actions={publishActions(item)}
              onDownload={() => void download(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
