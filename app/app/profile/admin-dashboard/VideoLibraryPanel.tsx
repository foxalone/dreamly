"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import type { AdminVideoLibraryItem } from "@/lib/adminVideoLibrary";
import type { TikTokConnectionStatus } from "@/lib/adminTikTok";
import type { MetaConnectionStatus } from "@/lib/adminMeta";

type Platform = "tiktok" | "instagram" | "facebook";
type TikTokStatus = TikTokConnectionStatus & { redirectUri?: string };
type MetaStatus = MetaConnectionStatus & { redirectUri?: string };

function TikTokGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.01 1.97 2.89 2.89 0 0 1 2.24-4.76c.28 0 .54.04.79.1v-3.52a6.34 6.34 0 0 0-.79-.05A6.34 6.34 0 0 0 3.16 15.2a6.34 6.34 0 0 0 10.68 4.61V8.73a8.18 8.18 0 0 0 4.75 1.5V6.77a4.84 4.84 0 0 1-1-.08Z" />
    </svg>
  );
}

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

function platformLabel(platform: Platform) {
  if (platform === "tiktok") return "TikTok";
  if (platform === "instagram") return "Instagram Reels";
  return "Facebook Reels";
}

function PublishIconButton({
  platform,
  published,
  disabled,
  busy,
  onClick,
}: {
  platform: Platform;
  published: boolean;
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const label = published ? `Уже в ${platformLabel(platform)}` : `Опубликовать в ${platformLabel(platform)}`;
  const color =
    platform === "tiktok"
      ? "text-[var(--text)] hover:bg-black hover:text-white"
      : platform === "instagram"
        ? "text-pink-600 hover:bg-gradient-to-br hover:from-yellow-400 hover:via-pink-500 hover:to-purple-600 hover:text-white"
        : "text-[#1877F2] hover:bg-[#1877F2] hover:text-white";
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled || busy}
      onClick={onClick}
      className={`relative flex h-7 w-7 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-35 ${
        published ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-600" : `border-[var(--border)] bg-[var(--card)] ${color}`
      }`}
    >
      {busy ? <span className="text-[10px] font-bold">…</span> : platform === "tiktok" ? <TikTokGlyph /> : platform === "instagram" ? <InstagramGlyph /> : <FacebookGlyph />}
      {published && !busy ? (
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500" />
      ) : null}
    </button>
  );
}

function VideoTile({ item }: { item: AdminVideoLibraryItem }) {
  return (
    <a
      href={item.videoUrl}
      target="_blank"
      rel="noreferrer"
      className="group block overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] transition hover:border-[color-mix(in_srgb,var(--text)_35%,transparent)]"
    >
      <div className="relative aspect-square overflow-hidden bg-[color-mix(in_srgb,var(--text)_8%,transparent)]">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <video
            src={item.videoUrl}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-90" />
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <p className="line-clamp-2 text-[11px] font-bold leading-4 text-white">{item.title}</p>
          <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-white/75">{item.sourceLabel}</p>
        </div>
      </div>
    </a>
  );
}

export default function VideoLibraryPanel({ user }: { user: User }) {
  const [items, setItems] = useState<AdminVideoLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [tiktok, setTiktok] = useState<TikTokStatus | null>(null);
  const [meta, setMeta] = useState<MetaStatus | null>(null);
  const [connecting, setConnecting] = useState<"" | "tiktok" | "meta">("");
  const [resetting, setResetting] = useState<"" | "tiktok" | "meta">("");
  const [publishingKey, setPublishingKey] = useState("");
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }), []);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [libraryResponse, statusResponse, metaResponse] = await Promise.all([
        fetch("/api/admin/video-library", { headers, cache: "no-store" }),
        fetch("/api/admin/tiktok/status", { headers, cache: "no-store" }),
        fetch("/api/admin/meta/status", { headers, cache: "no-store" }),
      ]);
      const libraryPayload = (await libraryResponse.json()) as { items?: AdminVideoLibraryItem[]; error?: string };
      if (!libraryResponse.ok) throw new Error(libraryPayload.error || "Не удалось загрузить библиотеку");
      setItems(libraryPayload.items ?? []);

      const statusPayload = (await statusResponse.json()) as TikTokStatus & { error?: string };
      if (statusResponse.ok) setTiktok(statusPayload);
      const metaPayload = (await metaResponse.json()) as MetaStatus & { error?: string };
      if (metaResponse.ok) setMeta(metaPayload);
      setError("");
    } catch (loadError) {
      if (!quiet) setError(loadError instanceof Error ? loadError.message : "Ошибка загрузки");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tiktokResult = params.get("tiktok");
    const metaResult = params.get("meta");
    if (tiktokResult === "connected") {
      setNotice({ type: "ok", text: "TikTok подключён. Можно публиковать видео." });
    } else if (tiktokResult === "error") {
      setNotice({ type: "error", text: params.get("tiktok_error") || "Не удалось подключить TikTok" });
    } else if (metaResult === "connected") {
      setNotice({ type: "ok", text: "Meta подключена. Можно публиковать Reels в Instagram и Facebook." });
    } else if (metaResult === "error") {
      setNotice({ type: "error", text: params.get("meta_error") || "Не удалось подключить Meta" });
    }
  }, []);

  async function connectTikTok() {
    setConnecting("tiktok");
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/tiktok/oauth/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { authorizeUrl?: string; error?: string };
      if (!response.ok || !payload.authorizeUrl) {
        throw new Error(payload.error || "Не удалось начать OAuth TikTok");
      }
      window.location.href = payload.authorizeUrl;
    } catch (connectError) {
      setNotice({ type: "error", text: connectError instanceof Error ? connectError.message : "Ошибка подключения" });
      setConnecting("");
    }
  }

  async function connectMeta() {
    setConnecting("meta");
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/meta/oauth/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { authorizeUrl?: string; error?: string };
      if (!response.ok || !payload.authorizeUrl) {
        throw new Error(payload.error || "Не удалось начать OAuth Meta");
      }
      window.location.href = payload.authorizeUrl;
    } catch (connectError) {
      setNotice({ type: "error", text: connectError instanceof Error ? connectError.message : "Ошибка подключения" });
      setConnecting("");
    }
  }

  async function resetConnection(kind: "tiktok" | "meta") {
    setResetting(kind);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(kind === "tiktok" ? "/api/admin/tiktok/disconnect" : "/api/admin/meta/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `Не удалось сбросить ${kind === "tiktok" ? "TikTok" : "Meta"}`);
      }
      setNotice({
        type: "ok",
        text: kind === "tiktok" ? "TikTok сброшен. Можно подключить аккаунт заново." : "Meta сброшена. Можно подключить Facebook/Instagram заново.",
      });
      await load(true);
    } catch (resetError) {
      setNotice({ type: "error", text: resetError instanceof Error ? resetError.message : "Ошибка сброса" });
    } finally {
      setResetting("");
    }
  }

  function markPublished(itemId: string, platform: Platform) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              published: {
                tiktok: Boolean(item.published?.tiktok),
                instagram: Boolean(item.published?.instagram),
                facebook: Boolean(item.published?.facebook),
                [platform]: true,
              },
            }
          : item,
      ),
    );
  }

  async function publishToTikTok(item: AdminVideoLibraryItem) {
    setPublishingKey(`tiktok:${item.id}`);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/tiktok/publish", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ libraryId: item.id }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        status?: string;
        privacyLevel?: string;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Не удалось опубликовать в TikTok");
      }
      const privacyNote =
        payload.privacyLevel === "PUBLIC_TO_EVERYONE"
          ? "публично"
          : payload.privacyLevel === "SELF_ONLY"
            ? "только для вас (нужен TikTok audit для public)"
            : payload.privacyLevel || "ok";
      markPublished(item.id, "tiktok");
      setNotice({
        type: "ok",
        text: `Опубликовано в TikTok · ${payload.status || "done"} · ${privacyNote}`,
      });
    } catch (publishError) {
      setNotice({ type: "error", text: publishError instanceof Error ? publishError.message : "Ошибка публикации" });
    } finally {
      setPublishingKey("");
    }
  }

  async function publishToMeta(item: AdminVideoLibraryItem, target: "instagram" | "facebook") {
    setPublishingKey(`${target}:${item.id}`);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/meta/publish", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ libraryId: item.id, target }),
      });
      const payload = (await response.json()) as { ok?: boolean; status?: string; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `Не удалось опубликовать в ${platformLabel(target)}`);
      }
      markPublished(item.id, target);
      setNotice({
        type: "ok",
        text: `Опубликовано в ${platformLabel(target)} · ${payload.status || "PUBLISHED"}`,
      });
    } catch (publishError) {
      setNotice({ type: "error", text: publishError instanceof Error ? publishError.message : "Ошибка публикации" });
    } finally {
      setPublishingKey("");
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-500">Video library</p>
          <h2 className="mt-1 text-2xl font-bold text-[var(--text)]">Все сгенерированные видео</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Free Video · Sora · Combined · Veo · {items.length} готовых
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void load()} className="text-sm font-semibold text-[var(--muted)] underline">
            Обновить
          </button>
          <button
            type="button"
            disabled={resetting === "tiktok"}
            onClick={() => void resetConnection("tiktok")}
            className="rounded-full border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--text)] disabled:opacity-50"
          >
            {resetting === "tiktok" ? "Сбрасываем…" : "Reset TikTok"}
          </button>
          <button
            type="button"
            disabled={connecting === "tiktok"}
            onClick={() => void connectTikTok()}
            className="rounded-full bg-[var(--text)] px-4 py-2.5 text-sm font-bold text-[var(--bg)] disabled:opacity-50"
          >
            {connecting === "tiktok" ? "Открываем TikTok…" : tiktok?.connected ? "Reconnect TikTok" : "Connect TikTok"}
          </button>
          <button
            type="button"
            disabled={resetting === "meta"}
            onClick={() => void resetConnection("meta")}
            className="rounded-full border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--text)] disabled:opacity-50"
          >
            {resetting === "meta" ? "Сбрасываем…" : "Reset Meta"}
          </button>
          <button
            type="button"
            disabled={connecting === "meta"}
            onClick={() => void connectMeta()}
            className="rounded-full bg-[#1877F2] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {connecting === "meta" ? "Открываем Meta…" : meta?.connected ? "Reconnect Meta" : "Connect Meta"}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_4%,transparent)] px-4 py-3 text-sm text-[var(--muted)]">
          {tiktok?.configured === false ? (
            <span>
              TikTok env: <code className="text-[var(--text)]">TIKTOK_CLIENT_KEY</code>,{" "}
              <code className="text-[var(--text)]">TIKTOK_CLIENT_SECRET</code>
              {tiktok.redirectUri ? (
                <>
                  {" "}
                  · Redirect URI: <code className="text-[var(--text)]">{tiktok.redirectUri}</code>
                </>
              ) : null}
            </span>
          ) : tiktok?.connected ? (
            <span>
              TikTok подключён{tiktok.displayName ? ` · @${tiktok.displayName}` : ""}
              {tiktok.scope ? ` · scopes: ${tiktok.scope}` : ""}
            </span>
          ) : (
            <span>TikTok ещё не подключён. Нажмите Connect TikTok и авторизуйте аккаунт для публикации.</span>
          )}
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_4%,transparent)] px-4 py-3 text-sm text-[var(--muted)]">
          {meta?.configured === false ? (
            <span>
              Meta env: <code className="text-[var(--text)]">META_APP_ID</code>,{" "}
              <code className="text-[var(--text)]">META_APP_SECRET</code>
              {meta.redirectUri ? (
                <>
                  {" "}
                  · Redirect URI: <code className="text-[var(--text)]">{meta.redirectUri}</code>
                </>
              ) : null}
            </span>
          ) : meta?.connected ? (
            <span>
              Meta подключена
              {meta.instagramReady ? ` · IG @${meta.igUsername || meta.igUserId}` : " · Instagram не привязан к Page"}
              {meta.facebookReady ? ` · FB ${meta.pageName || meta.pageId}` : ""}
            </span>
          ) : (
            <span>Meta ещё не подключена. Один OAuth открывает Instagram Reels и Facebook Reels.</span>
          )}
        </div>
      </div>

      {notice && (
        <p
          className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
            notice.type === "ok" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
          }`}
        >
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
          Готовых видео пока нет.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-5 gap-2">
          {items.map((item) => (
            <div key={item.id} className="min-w-0">
              <VideoTile item={item} />
              <div className="mt-1.5 flex items-center justify-between gap-1 px-0.5">
                <p className="truncate text-[10px] text-[var(--muted)]">{dateFormatter.format(new Date(item.createdAt))}</p>
                <div className="flex shrink-0 items-center gap-0.5">
                  <PublishIconButton
                    platform="tiktok"
                    published={Boolean(item.published?.tiktok)}
                    disabled={!tiktok?.connected}
                    busy={publishingKey === `tiktok:${item.id}`}
                    onClick={() => void publishToTikTok(item)}
                  />
                  <PublishIconButton
                    platform="instagram"
                    published={Boolean(item.published?.instagram)}
                    disabled={!meta?.instagramReady}
                    busy={publishingKey === `instagram:${item.id}`}
                    onClick={() => void publishToMeta(item, "instagram")}
                  />
                  <PublishIconButton
                    platform="facebook"
                    published={Boolean(item.published?.facebook)}
                    disabled={!meta?.facebookReady}
                    busy={publishingKey === `facebook:${item.id}`}
                    onClick={() => void publishToMeta(item, "facebook")}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
