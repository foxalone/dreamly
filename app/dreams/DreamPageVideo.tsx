"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { videoMinutes, youtubeEmbedUrl, youtubeThumbnail, type DreamPageVideo } from "@/lib/dreamPageVideo";

const ADMIN_UIDS = new Set<string>(["sGbA77TlcsatEMrgEvCv7Shjrj32"]);
const PLAYER_ID = "video";

type Labels = { watch: string; watchMinutes: string };

type PageVideoContextValue = {
  video: DreamPageVideo | null;
  isAdmin: boolean;
  playing: boolean;
  labels: Labels;
  play: () => void;
  openEditor: () => void;
};

const PageVideoContext = createContext<PageVideoContextValue | null>(null);

function usePageVideo() {
  const value = useContext(PageVideoContext);
  if (!value) throw new Error("Dream page video context is missing");
  return value;
}

export function DreamPageVideoProvider({
  slug,
  initialVideo = null,
  labels,
  children,
}: {
  slug: string;
  initialVideo?: DreamPageVideo | null;
  labels: Labels;
  children: ReactNode;
}) {
  const [video, setVideo] = useState<DreamPageVideo | null>(initialVideo);
  const [isAdmin, setIsAdmin] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "remove">("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => onAuthStateChanged(auth, (user) => setIsAdmin(Boolean(user?.uid && ADMIN_UIDS.has(user.uid)))), []);

  const play = useCallback(() => {
    setPlaying(true);
    document.getElementById(PLAYER_ID)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const openEditor = useCallback(() => {
    setUrl(video ? `https://youtu.be/${video.youtubeId}` : "");
    setError("");
    setEditorOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }, [video]);

  const request = useCallback(async (method: "PUT" | "DELETE") => {
    const user = auth.currentUser;
    if (!user) return;
    setBusy(method === "PUT" ? "save" : "remove");
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        method === "PUT" ? "/api/admin/dream-page-video" : `/api/admin/dream-page-video?slug=${encodeURIComponent(slug)}`,
        {
          method,
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          ...(method === "PUT" ? { body: JSON.stringify({ slug, url }) } : {}),
        },
      );
      const payload = (await response.json()) as { video?: DreamPageVideo | null; error?: string };
      if (!response.ok) throw new Error(payload.error || "Не удалось сохранить");
      setVideo(payload.video ?? null);
      setPlaying(false);
      setEditorOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setBusy("");
    }
  }, [slug, url]);

  const value = useMemo(
    () => ({ video, isAdmin, playing, labels, play, openEditor }),
    [video, isAdmin, playing, labels, play, openEditor],
  );

  return (
    <PageVideoContext.Provider value={value}>
      {children}
      {editorOpen && isAdmin ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={(event) => { if (event.target === event.currentTarget) setEditorOpen(false); }}
        >
          <form
            onSubmit={(event) => { event.preventDefault(); void request("PUT"); }}
            className="w-full max-w-lg rounded-3xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-5 shadow-2xl"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Admin</p>
            <h3 className="mt-1 text-lg font-semibold text-[var(--dd-text)]">Видео YouTube для этой страницы</h3>
            <input
              ref={inputRef}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://youtu.be/… или https://www.youtube.com/watch?v=…"
              className="mt-4 w-full rounded-xl border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] px-3.5 py-2.5 text-sm text-[var(--dd-text)] outline-none focus:ring-2 focus:ring-amber-400/40"
            />
            {error ? <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">{error}</p> : null}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              {video ? (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void request("DELETE")}
                  className="rounded-full border border-[var(--dd-border)] px-3.5 py-2 text-xs font-semibold text-[var(--dd-muted)] disabled:opacity-50"
                >
                  {busy === "remove" ? "Убираем…" : "Убрать видео"}
                </button>
              ) : <span />}
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditorOpen(false)} className="rounded-full border border-[var(--dd-border)] px-3.5 py-2 text-xs font-semibold text-[var(--dd-text)]">
                  Отмена
                </button>
                <button type="submit" disabled={Boolean(busy) || !url.trim()} className="rounded-full bg-amber-400 px-4 py-2 text-xs font-bold text-black disabled:opacity-50">
                  {busy === "save" ? "Проверяем…" : "Сохранить"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </PageVideoContext.Provider>
  );
}

function PlayGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M8 5.5v13a1 1 0 0 0 1.52.85l10.4-6.5a1 1 0 0 0 0-1.7L9.52 4.65A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

/** YouTube-red pill under "General meaning": scrolls to the player and starts it. */
export function DreamPageVideoWatchButton() {
  const { video, labels, play } = usePageVideo();
  if (!video) return null;
  const minutes = videoMinutes(video.duration);
  const label = minutes ? labels.watchMinutes.replace("{minutes}", String(minutes)) : labels.watch;
  return (
    <button
      type="button"
      onClick={play}
      className="group mt-3 inline-flex items-center gap-2 rounded-full bg-[#ff0033] py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold text-white shadow-[0_6px_20px_-6px_rgba(255,0,51,0.7)] transition hover:bg-[#e6002e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <span className="grid size-6 place-items-center rounded-full bg-white/20 transition group-hover:bg-white/30">
        <PlayGlyph className="ml-0.5 size-3.5" />
      </span>
      {label}
    </button>
  );
}

/**
 * Lite embed: the thumbnail + play button costs one image; the YouTube iframe
 * (≈1 MB of script) only loads when the reader actually presses play.
 */
export function DreamPageVideoPlayer() {
  const { video, playing, play } = usePageVideo();
  if (!video) return null;
  const title = video.title || "Video";
  return (
    <div id={PLAYER_ID} className="mt-9 scroll-mt-28 overflow-hidden rounded-[1.4rem] border border-[var(--dd-border)] bg-black">
      <div className="relative aspect-video">
        {playing ? (
          <iframe
            src={youtubeEmbedUrl(video.youtubeId)}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button type="button" onClick={play} aria-label={`Play: ${title}`} className="group absolute inset-0 block h-full w-full text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={video.thumbnailUrl || youtubeThumbnail(video.youtubeId)}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.015]"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <span className="absolute left-1/2 top-1/2 grid h-12 w-[68px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-[#ff0033] text-white shadow-xl transition group-hover:scale-105">
              <PlayGlyph className="ml-0.5 size-6" />
            </span>
            <span className="absolute inset-x-4 bottom-3 line-clamp-2 text-sm font-semibold text-white drop-shadow sm:text-base">{title}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Admin-only yellow dot next to "Common scenarios": attach / change / remove the page video. */
export function DreamPageVideoAdminDot() {
  const { isAdmin, video, openEditor } = usePageVideo();
  if (!isAdmin) return null;
  const label = video ? "Сменить видео YouTube" : "Добавить видео YouTube";
  return (
    <button
      type="button"
      onClick={openEditor}
      title={label}
      aria-label={label}
      className={`inline-flex size-3.5 shrink-0 rounded-full bg-amber-400 transition hover:scale-110 hover:opacity-100 ${video ? "opacity-90" : "opacity-60"}`}
    />
  );
}
