"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import type { AdminVideoLibraryItem } from "@/lib/adminVideoLibrary";
import type { TikTokConnectionStatus } from "@/lib/adminTikTok";

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
  const [tiktok, setTiktok] = useState<TikTokConnectionStatus & { redirectUri?: string } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [publishingId, setPublishingId] = useState("");
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }), []);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const token = await user.getIdToken();
      const [libraryResponse, statusResponse] = await Promise.all([
        fetch("/api/admin/video-library", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch("/api/admin/tiktok/status", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);
      const libraryPayload = (await libraryResponse.json()) as { items?: AdminVideoLibraryItem[]; error?: string };
      if (!libraryResponse.ok) throw new Error(libraryPayload.error || "Не удалось загрузить библиотеку");
      setItems(libraryPayload.items ?? []);

      const statusPayload = (await statusResponse.json()) as TikTokConnectionStatus & { redirectUri?: string; error?: string };
      if (statusResponse.ok) setTiktok(statusPayload);
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
    if (tiktokResult === "connected") {
      setNotice({ type: "ok", text: "TikTok подключён. Можно публиковать видео." });
    } else if (tiktokResult === "error") {
      setNotice({ type: "error", text: params.get("tiktok_error") || "Не удалось подключить TikTok" });
    }
  }, []);

  async function connectTikTok() {
    setConnecting(true);
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
      setConnecting(false);
    }
  }

  async function resetTikTok() {
    setResetting(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/tiktok/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Не удалось сбросить TikTok");
      }
      setNotice({ type: "ok", text: "TikTok сброшен. Можно подключить аккаунт заново." });
      await load(true);
    } catch (resetError) {
      setNotice({ type: "error", text: resetError instanceof Error ? resetError.message : "Ошибка сброса" });
    } finally {
      setResetting(false);
    }
  }

  async function publishToTikTok(item: AdminVideoLibraryItem) {
    setPublishingId(item.id);
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
      setNotice({
        type: "ok",
        text: `Опубликовано в TikTok · ${payload.status || "done"} · ${privacyNote}`,
      });
    } catch (publishError) {
      setNotice({ type: "error", text: publishError instanceof Error ? publishError.message : "Ошибка публикации" });
    } finally {
      setPublishingId("");
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
            disabled={resetting}
            onClick={() => void resetTikTok()}
            className="rounded-full border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--text)] disabled:opacity-50"
          >
            {resetting ? "Сбрасываем…" : "Reset TikTok"}
          </button>
          <button
            type="button"
            disabled={connecting}
            onClick={() => void connectTikTok()}
            className="rounded-full bg-[var(--text)] px-4 py-2.5 text-sm font-bold text-[var(--bg)] disabled:opacity-50"
          >
            {connecting ? "Открываем TikTok…" : tiktok?.connected ? "Reconnect TikTok" : "Connect TikTok"}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_4%,transparent)] px-4 py-3 text-sm text-[var(--muted)]">
        {tiktok?.configured === false ? (
          <span>
            Добавьте в env: <code className="text-[var(--text)]">TIKTOK_CLIENT_KEY</code>,{" "}
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
                <button
                  type="button"
                  disabled={!tiktok?.connected || publishingId === item.id}
                  onClick={() => void publishToTikTok(item)}
                  className="shrink-0 rounded-full border border-[var(--border)] px-2 py-1 text-[10px] font-bold text-[var(--text)] disabled:opacity-40"
                >
                  {publishingId === item.id ? "…" : "Publish"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
