"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { Trash2 } from "lucide-react";
import {
  PINTEREST_BOARD_NAME,
  QUEUED_SCHEDULE_PLATFORMS,
  type AdminVideoLibraryItem,
} from "@/lib/adminVideoLibrary";
import type { TikTokConnectionStatus } from "@/lib/adminTikTok";
import type { MetaConnectionStatus } from "@/lib/adminMeta";
import type { ThreadsConnectionStatus } from "@/lib/adminThreads";
import type { BlueskyConnectionStatus } from "@/lib/adminBluesky";
import { youtubeWatchUrl, type YouTubeConnectionStatus } from "@/lib/adminYouTube";
import {
  pinterestPinUrl,
  SHOW_PINTEREST_PUBLISH_ERRORS,
  type PinterestConnectionStatus,
} from "@/lib/adminPinterest";
import type { TumblrConnectionStatus } from "@/lib/adminTumblr";

type Platform = "tiktok" | "instagram" | "facebook" | "threads" | "bluesky" | "youtube" | "pinterest" | "tumblr";
type Connection = "meta" | "threads" | "youtube" | "pinterest" | "tumblr";
type TikTokStatus = TikTokConnectionStatus;
type MetaStatus = MetaConnectionStatus & { redirectUri?: string };
type ThreadsStatus = ThreadsConnectionStatus & { redirectUri?: string };
type BlueskyStatus = BlueskyConnectionStatus;
type YouTubeStatus = YouTubeConnectionStatus & { redirectUri?: string };
type PinterestStatus = PinterestConnectionStatus & { redirectUri?: string };
type TumblrStatus = TumblrConnectionStatus & { redirectUri?: string };

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

function BlueskyGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z" />
    </svg>
  );
}

function YouTubeGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15.1V8.9l5.2 3.1L10 15.1Z" />
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

function TumblrGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <text
        x="12"
        y="16.6"
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill="currentColor"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        t
      </text>
    </svg>
  );
}

// datetime-local gives a wall-clock string with no zone; new Date() reads it in
// the admin's local zone and toISOString() hands YouTube the correct UTC value.
function localInputToIso(value: string) {
  const when = new Date(value);
  return Number.isFinite(when.getTime()) ? when.toISOString() : "";
}

// Publishing runs on Jerusalem time, so the picker opens on tomorrow 15:00
// there. The value is rendered in the browser's own zone, so an admin sitting
// elsewhere still sees the moment that equals 15:00 in Jerusalem.
const SCHEDULE_TIME_ZONE = "Asia/Jerusalem";
const SCHEDULE_DEFAULT_HOUR = 15;

function toLocalInputValue(when: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}T${pad(when.getHours())}:${pad(when.getMinutes())}`;
}

// How far the Jerusalem wall clock sits from UTC at that instant (DST aware).
function scheduleZoneOffsetMs(instant: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SCHEDULE_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(instant)
    .reduce<Record<string, number>>((accumulator, part) => {
      if (part.type !== "literal") accumulator[part.type] = Number(part.value);
      return accumulator;
    }, {});
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - instant.getTime();
}

function defaultScheduleValue() {
  const now = new Date();
  const jerusalemNow = new Date(now.getTime() + scheduleZoneOffsetMs(now));
  const wallClock = Date.UTC(
    jerusalemNow.getUTCFullYear(),
    jerusalemNow.getUTCMonth(),
    jerusalemNow.getUTCDate() + 1,
    SCHEDULE_DEFAULT_HOUR,
    0,
    0,
  );
  // Resolve twice so a DST change between now and the target is applied.
  const firstPass = wallClock - scheduleZoneOffsetMs(now);
  return toLocalInputValue(new Date(wallClock - scheduleZoneOffsetMs(new Date(firstPass))));
}

function minScheduleValue() {
  return toLocalInputValue(new Date(Date.now() + 60 * 1000));
}

function platformLabel(platform: Platform) {
  if (platform === "tiktok") return "TikTok";
  if (platform === "instagram") return "Instagram Reels";
  if (platform === "threads") return "Threads";
  if (platform === "bluesky") return "Bluesky";
  if (platform === "youtube") return "YouTube";
  if (platform === "pinterest") return "Pinterest";
  if (platform === "tumblr") return "Tumblr";
  return "Facebook Reels";
}

function visibleScheduleError(error: string) {
  if (SHOW_PINTEREST_PUBLISH_ERRORS) return error;
  return error
    .split("; ")
    .filter((entry) => !entry.trimStart().toLowerCase().startsWith("pinterest:"))
    .join("; ");
}

function PublishIconButton({
  platform,
  published,
  failed = false,
  failureNote = "",
  openHint = "",
  scheduled = false,
  scheduledNote = "",
  processing = false,
  disabled,
  busy,
  onClick,
}: {
  platform: Platform;
  published: boolean;
  failed?: boolean;
  failureNote?: string;
  openHint?: string;
  scheduled?: boolean;
  scheduledNote?: string;
  processing?: boolean;
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const label = published
    ? `Уже в ${platformLabel(platform)}${openHint ? ` · ${openHint}` : ""}`
    : scheduled
      ? `Запланировано в ${platformLabel(platform)}${scheduledNote ? ` на ${scheduledNote}` : ""}${openHint ? ` · ${openHint}` : ""}`
      : processing
        ? `Публикуется в ${platformLabel(platform)}`
      : failed
      ? `Ошибка публикации в ${platformLabel(platform)}${failureNote ? `: ${failureNote}` : ""} · нажмите, чтобы повторить`
      : `Опубликовать в ${platformLabel(platform)}`;
  const color =
    platform === "tiktok"
      ? "text-[var(--text)] hover:bg-black hover:text-white"
      : platform === "instagram"
        ? "text-pink-600 hover:bg-gradient-to-br hover:from-yellow-400 hover:via-pink-500 hover:to-purple-600 hover:text-white"
        : platform === "threads"
          ? "text-[var(--text)] hover:bg-black hover:text-white"
          : platform === "bluesky"
            ? "text-[#1185FE] hover:bg-[#1185FE] hover:text-white"
          : platform === "youtube"
            ? "text-[#FF0000] hover:bg-[#FF0000] hover:text-white"
            : platform === "pinterest"
              ? "text-[#E60023] hover:bg-[#E60023] hover:text-white"
              : platform === "tumblr"
                ? "text-[#36465D] hover:bg-[#001935] hover:text-white"
                : "text-[#1877F2] hover:bg-[#1877F2] hover:text-white";
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled || busy}
      onClick={onClick}
      className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-35 ${
        published
          ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-600"
          : scheduled || processing
            ? "border-amber-500/70 bg-amber-500/10 text-amber-600"
            : failed
            ? "border-red-500/70 bg-red-500/10 text-red-500"
            : `border-[var(--border)] bg-[var(--card)] ${color}`
      }`}
    >
      {busy ? (
        <span className="text-[10px] font-bold">…</span>
      ) : platform === "tiktok" ? (
        <TikTokGlyph />
      ) : platform === "instagram" ? (
        <InstagramGlyph />
      ) : platform === "threads" ? (
        <ThreadsGlyph />
      ) : platform === "bluesky" ? (
        <BlueskyGlyph />
      ) : platform === "youtube" ? (
        <YouTubeGlyph />
      ) : platform === "pinterest" ? (
        <PinterestGlyph />
      ) : platform === "tumblr" ? (
        <TumblrGlyph />
      ) : (
        <FacebookGlyph />
      )}
      {published && !busy ? (
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500" />
      ) : (scheduled || processing) && !busy ? (
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500" />
      ) : null}
    </button>
  );
}

function VideoTile({
  item,
  dateLabel,
  scheduledNote = "",
  actions,
}: {
  item: AdminVideoLibraryItem;
  dateLabel: string;
  scheduledNote?: string;
  actions: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)]">
      <div className="relative aspect-square overflow-hidden bg-[color-mix(in_srgb,var(--text)_8%,transparent)]">
        <a
          href={item.videoUrl}
          target="_blank"
          rel="noreferrer"
          title={item.title}
          className="group absolute inset-0 block"
        >
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
        </a>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />
        {dateLabel ? (
          <p className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-[2px]">
            {dateLabel}
          </p>
        ) : null}
        {scheduledNote ? (
          <p className="pointer-events-none absolute right-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
            {scheduledNote}
          </p>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 z-10 px-1 pb-1.5 pt-6">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-black/35 px-1 py-1 backdrop-blur-[2px]">
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteVideoButton({
  busy,
  disabled,
  onClick,
}: {
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const label = busy ? "Удаляем видео…" : "Удалить видео";
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled || busy}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-red-500/70 bg-black/45 text-red-400 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
    >
      {busy ? <span className="text-[10px] font-bold">…</span> : <Trash2 className="h-3.5 w-3.5" aria-hidden />}
    </button>
  );
}

export default function VideoLibraryPanel({
  user,
  view = "library",
}: {
  user: User;
  view?: "library" | "connections";
}) {
  const [items, setItems] = useState<AdminVideoLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [tiktok, setTiktok] = useState<TikTokStatus | null>(null);
  const [meta, setMeta] = useState<MetaStatus | null>(null);
  const [threads, setThreads] = useState<ThreadsStatus | null>(null);
  const [bluesky, setBluesky] = useState<BlueskyStatus | null>(null);
  const [youtube, setYoutube] = useState<YouTubeStatus | null>(null);
  const [pinterest, setPinterest] = useState<PinterestStatus | null>(null);
  const [tumblr, setTumblr] = useState<TumblrStatus | null>(null);
  const [connecting, setConnecting] = useState<"" | Connection>("");
  const [resetting, setResetting] = useState<"" | Connection>("");
  const [publishingKey, setPublishingKey] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [scheduleFor, setScheduleFor] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"youtube" | "all">("youtube");
  const [scheduleAt, setScheduleAt] = useState("");
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }), []);
  const scheduleItem = useMemo(
    () => (scheduleFor ? items.find((entry) => entry.id === scheduleFor) || null : null),
    [items, scheduleFor],
  );
  const scheduleFormatter = useMemo(
    () => new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    [],
  );

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [
        libraryResponse,
        statusResponse,
        metaResponse,
        threadsResponse,
        blueskyResponse,
        youtubeResponse,
        pinterestResponse,
        tumblrResponse,
      ] = await Promise.all([
        fetch("/api/admin/video-library", { headers, cache: "no-store" }),
        fetch("/api/admin/tiktok/status", { headers, cache: "no-store" }),
        fetch("/api/admin/meta/status", { headers, cache: "no-store" }),
        fetch("/api/admin/threads/status", { headers, cache: "no-store" }),
        fetch("/api/admin/bluesky/status", { headers, cache: "no-store" }),
        fetch("/api/admin/youtube/status", { headers, cache: "no-store" }),
        fetch("/api/admin/pinterest/status", { headers, cache: "no-store" }),
        fetch("/api/admin/tumblr/status", { headers, cache: "no-store" }),
      ]);
      const libraryPayload = (await libraryResponse.json()) as { items?: AdminVideoLibraryItem[]; error?: string };
      if (!libraryResponse.ok) throw new Error(libraryPayload.error || "Не удалось загрузить библиотеку");
      setItems(libraryPayload.items ?? []);

      const statusPayload = (await statusResponse.json()) as TikTokStatus & { error?: string };
      if (statusResponse.ok) setTiktok(statusPayload);
      const metaPayload = (await metaResponse.json()) as MetaStatus & { error?: string };
      if (metaResponse.ok) setMeta(metaPayload);
      const threadsPayload = (await threadsResponse.json()) as ThreadsStatus & { error?: string };
      if (threadsResponse.ok) setThreads(threadsPayload);
      const blueskyPayload = (await blueskyResponse.json()) as BlueskyStatus & { error?: string };
      if (blueskyResponse.ok) setBluesky(blueskyPayload);
      const youtubePayload = (await youtubeResponse.json()) as YouTubeStatus & { error?: string };
      if (youtubeResponse.ok) setYoutube(youtubePayload);
      const pinterestPayload = (await pinterestResponse.json()) as PinterestStatus & { error?: string };
      if (pinterestResponse.ok) setPinterest(pinterestPayload);
      const tumblrPayload = (await tumblrResponse.json()) as TumblrStatus & { error?: string };
      if (tumblrResponse.ok) setTumblr(tumblrPayload);
      setError("");
    } catch (loadError) {
      if (!quiet) setError(loadError instanceof Error ? loadError.message : "Ошибка загрузки");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (!publishingKey && !deletingId) void load(true);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [deletingId, load, publishingKey]);

  useEffect(() => {
    if (view !== "connections") return;
    const params = new URLSearchParams(window.location.search);
    const metaResult = params.get("meta");
    const threadsResult = params.get("threads");
    const youtubeResult = params.get("youtube");
    const pinterestResult = params.get("pinterest");
    const tumblrResult = params.get("tumblr");
    if (metaResult === "connected") {
      setNotice({ type: "ok", text: "Meta подключена. Можно публиковать Reels в Instagram и Facebook." });
    } else if (metaResult === "error") {
      setNotice({ type: "error", text: params.get("meta_error") || "Не удалось подключить Meta" });
    } else if (threadsResult === "connected") {
      setNotice({ type: "ok", text: "Threads подключён. Можно публиковать видео." });
    } else if (threadsResult === "error") {
      setNotice({ type: "error", text: params.get("threads_error") || "Не удалось подключить Threads" });
    } else if (youtubeResult === "connected") {
      setNotice({ type: "ok", text: "YouTube подключён. Можно загружать видео на канал." });
    } else if (youtubeResult === "error") {
      setNotice({ type: "error", text: params.get("youtube_error") || "Не удалось подключить YouTube" });
    } else if (pinterestResult === "connected") {
      setNotice({ type: "ok", text: "Pinterest подключён. Можно публиковать видеопины напрямую." });
    } else if (pinterestResult === "error") {
      setNotice({ type: "error", text: params.get("pinterest_error") || "Не удалось подключить Pinterest" });
    } else if (tumblrResult === "connected") {
      setNotice({ type: "ok", text: "Tumblr подключён. Видео уходят в блог напрямую через официальный API." });
    } else if (tumblrResult === "error") {
      setNotice({ type: "error", text: params.get("tumblr_error") || "Не удалось подключить Tumblr" });
    }
  }, [view]);

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

  async function connectThreads() {
    setConnecting("threads");
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/threads/oauth/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { authorizeUrl?: string; error?: string };
      if (!response.ok || !payload.authorizeUrl) {
        throw new Error(payload.error || "Не удалось начать OAuth Threads");
      }
      window.location.href = payload.authorizeUrl;
    } catch (connectError) {
      setNotice({ type: "error", text: connectError instanceof Error ? connectError.message : "Ошибка подключения" });
      setConnecting("");
    }
  }

  async function connectYouTube() {
    setConnecting("youtube");
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/youtube/oauth/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { authorizeUrl?: string; error?: string };
      if (!response.ok || !payload.authorizeUrl) {
        throw new Error(payload.error || "Не удалось начать OAuth YouTube");
      }
      window.location.href = payload.authorizeUrl;
    } catch (connectError) {
      setNotice({ type: "error", text: connectError instanceof Error ? connectError.message : "Ошибка подключения" });
      setConnecting("");
    }
  }

  async function connectPinterest() {
    setConnecting("pinterest");
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/pinterest/oauth/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { authorizeUrl?: string; error?: string };
      if (!response.ok || !payload.authorizeUrl) {
        throw new Error(payload.error || "Не удалось начать OAuth Pinterest");
      }
      window.location.href = payload.authorizeUrl;
    } catch (connectError) {
      setNotice({ type: "error", text: connectError instanceof Error ? connectError.message : "Ошибка подключения" });
      setConnecting("");
    }
  }

  async function connectTumblr() {
    setConnecting("tumblr");
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/tumblr/oauth/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { authorizeUrl?: string; error?: string };
      if (!response.ok || !payload.authorizeUrl) {
        throw new Error(payload.error || "Не удалось начать OAuth Tumblr");
      }
      window.location.href = payload.authorizeUrl;
    } catch (connectError) {
      setNotice({ type: "error", text: connectError instanceof Error ? connectError.message : "Ошибка подключения" });
      setConnecting("");
    }
  }

  async function resetConnection(kind: Connection) {
    setResetting(kind);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const endpoint =
        kind === "meta"
          ? "/api/admin/meta/disconnect"
          : kind === "threads"
            ? "/api/admin/threads/disconnect"
            : kind === "pinterest"
              ? "/api/admin/pinterest/disconnect"
              : kind === "tumblr"
                ? "/api/admin/tumblr/disconnect"
                : "/api/admin/youtube/disconnect";
      const connectionLabel =
        kind === "meta"
          ? "Meta"
          : kind === "threads"
            ? "Threads"
            : kind === "pinterest"
              ? "Pinterest"
              : kind === "tumblr"
                ? "Tumblr"
                : "YouTube";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `Не удалось сбросить ${connectionLabel}`);
      }
      setNotice({
        type: "ok",
        text:
          kind === "meta"
            ? "Meta сброшена. Можно подключить Facebook/Instagram заново."
            : kind === "threads"
              ? "Threads сброшен. Можно подключить аккаунт заново."
              : kind === "pinterest"
                ? "Pinterest сброшен. Можно подключить аккаунт заново."
                : kind === "tumblr"
                  ? "Tumblr отключён. Опубликованные посты остались в блоге."
                  : "YouTube сброшен. Можно подключить канал заново.",
      });
      await load(true);
    } catch (resetError) {
      setNotice({ type: "error", text: resetError instanceof Error ? resetError.message : "Ошибка сброса" });
    } finally {
      setResetting("");
    }
  }

  function markPublished(itemId: string, platform: Platform, extra: Partial<AdminVideoLibraryItem> = {}) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              published: {
                tiktok: Boolean(item.published?.tiktok),
                instagram: Boolean(item.published?.instagram),
                facebook: Boolean(item.published?.facebook),
                threads: Boolean(item.published?.threads),
                bluesky: Boolean(item.published?.bluesky),
                youtube: Boolean(item.published?.youtube),
                pinterest: Boolean(item.published?.pinterest),
                tumblr: Boolean(item.published?.tumblr),
                [platform]: true,
              },
              ...(platform === "tiktok" ? { tiktokState: "published" as const, tiktokError: "" } : {}),
              ...(platform === "threads" ? { threadsState: "published" as const, threadsError: "" } : {}),
              ...(platform === "bluesky" ? { blueskyState: "published" as const, blueskyError: "" } : {}),
              ...(platform === "youtube" ? { youtubeState: "published" as const, youtubeError: "" } : {}),
              ...(platform === "pinterest" ? { pinterestState: "published" as const, pinterestError: "" } : {}),
              ...(platform === "tumblr" ? { tumblrState: "published" as const, tumblrError: "" } : {}),
              ...extra,
            }
          : item,
      ),
    );
  }

  function cardBusy(itemId: string) {
    return deletingId === itemId || publishingKey.endsWith(`:${itemId}`);
  }

  async function deleteVideo(item: AdminVideoLibraryItem) {
    if (cardBusy(item.id)) return;
    const confirmed = window.confirm(
      `Удалить «${item.title}» навсегда?\n\nВидео и превью будут удалены из библиотеки. Копии, уже отправленные в соцсети, останутся там.`,
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/video-library", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ libraryId: item.id }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Не удалось удалить видео");
      }
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setScheduleFor((current) => (current === item.id ? "" : current));
      setNotice({ type: "ok", text: "Видео удалено из библиотеки." });
    } catch (deleteError) {
      setNotice({
        type: "error",
        text: deleteError instanceof Error ? deleteError.message : "Ошибка удаления",
      });
    } finally {
      setDeletingId("");
    }
  }

  // What "All" still has to do: connected, not published yet and not already
  // sitting in the schedule queue.
  function pendingPlatforms(item: AdminVideoLibraryItem): Platform[] {
    const queued = queuedPlatforms(item);
    const pending: Platform[] = [];
    if (tiktok?.connected && !item.published?.tiktok && item.tiktokState !== "publishing") pending.push("tiktok");
    if (meta?.instagramReady && !item.published?.instagram) pending.push("instagram");
    if (meta?.facebookReady && !item.published?.facebook) pending.push("facebook");
    if (threads?.connected && !item.published?.threads && item.threadsState !== "publishing") pending.push("threads");
    if (bluesky?.ready && !item.published?.bluesky && item.blueskyState !== "publishing") pending.push("bluesky");
    if (
      youtube?.connected &&
      !item.published?.youtube &&
      item.youtubeState !== "scheduled" &&
      item.youtubeState !== "uploading"
    ) {
      pending.push("youtube");
    }
    if (tumblr?.connected && !item.published?.tumblr && item.tumblrState !== "publishing") pending.push("tumblr");
    return pending.filter((platform) => !queued.includes(platform));
  }

  // Platforms currently sitting in the "All" queue for this video. YouTube is
  // never in it — it holds its own scheduled uploads.
  function queuedPlatforms(item: AdminVideoLibraryItem): Platform[] {
    if (item.scheduleStatus !== "pending" && item.scheduleStatus !== "running") return [];
    return (item.scheduledPlatforms || []).filter((platform): platform is Platform =>
      QUEUED_SCHEDULE_PLATFORMS.includes(platform),
    );
  }

  function batchScheduled(item: AdminVideoLibraryItem) {
    return queuedPlatforms(item).length > 0 || item.youtubeState === "scheduled";
  }

  function batchScheduledAt(item: AdminVideoLibraryItem) {
    return queuedPlatforms(item).length ? item.scheduledAt : item.youtubeScheduledAt;
  }

  function scheduleNoteFor(item: AdminVideoLibraryItem) {
    const when = batchScheduledAt(item);
    if (!when) return "";
    const parsed = new Date(when);
    return Number.isFinite(parsed.getTime()) ? scheduleFormatter.format(parsed) : "";
  }

  async function publishVideoTo(item: AdminVideoLibraryItem, platform: Platform, publishAt = "") {
    const token = await user.getIdToken();
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    if (platform === "tiktok") {
      const response = await fetch("/api/admin/tiktok/publish", {
        method: "POST",
        headers,
        body: JSON.stringify({ libraryId: item.id }),
      });
      const payload = (await response.json()) as { ok?: boolean; status?: string; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Не удалось опубликовать в TikTok");
      }
      if (payload.status === "PUBLISH_COMPLETE") markPublished(item.id, "tiktok");
      return payload.status || "done";
    }
    if (platform === "instagram" || platform === "facebook") {
      const response = await fetch("/api/admin/meta/publish", {
        method: "POST",
        headers,
        body: JSON.stringify({ libraryId: item.id, target: platform }),
      });
      const payload = (await response.json()) as { ok?: boolean; status?: string; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `Не удалось опубликовать в ${platformLabel(platform)}`);
      }
      markPublished(item.id, platform);
      return payload.status || "PUBLISHED";
    }
    if (platform === "threads") {
      const response = await fetch("/api/admin/threads/publish", {
        method: "POST",
        headers,
        body: JSON.stringify({ libraryId: item.id }),
      });
      const payload = (await response.json()) as { ok?: boolean; status?: string; postId?: string; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Не удалось опубликовать в Threads");
      }
      markPublished(item.id, "threads");
      return `${payload.status || "PUBLISHED"}${payload.postId ? ` · id ${payload.postId}` : ""}`;
    }
    if (platform === "bluesky") {
      const response = await fetch("/api/admin/bluesky/publish", {
        method: "POST",
        headers,
        body: JSON.stringify({ libraryId: item.id }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        status?: string;
        uri?: string;
        postUrl?: string;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Не удалось опубликовать в Bluesky");
      }
      markPublished(item.id, "bluesky", {
        blueskyUri: payload.uri || "",
        blueskyPostUrl: payload.postUrl || "",
      });
      return `${payload.status || "PUBLISHED"}${payload.postUrl ? ` · ${payload.postUrl}` : ""}`;
    }
    if (platform === "youtube") {
      const response = await fetch("/api/admin/youtube/publish", {
        method: "POST",
        headers,
        body: JSON.stringify(publishAt ? { libraryId: item.id, publishAt } : { libraryId: item.id }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        videoId?: string;
        privacyStatus?: string;
        status?: string;
        scheduledAt?: string;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Не удалось загрузить на YouTube");
      }
      const watch = payload.videoId ? ` · ${youtubeWatchUrl(payload.videoId)}` : "";
      if (payload.status === "SCHEDULED") {
        return `SCHEDULED · ${
          payload.scheduledAt ? scheduleFormatter.format(new Date(payload.scheduledAt)) : ""
        }${watch}`;
      }
      markPublished(item.id, "youtube", { youtubeVideoId: payload.videoId || "" });
      return `${payload.privacyStatus || "public"}${watch}`;
    }
    if (platform === "tumblr") {
      const response = await fetch("/api/admin/tumblr/publish", {
        method: "POST",
        headers,
        body: JSON.stringify({ libraryId: item.id }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        status?: string;
        postId?: string;
        postUrl?: string;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Не удалось опубликовать в Tumblr");
      }
      markPublished(item.id, "tumblr", {
        tumblrPostId: payload.postId || "",
        tumblrPostUrl: payload.postUrl || "",
      });
      return `${payload.status || "PUBLISHED"}${payload.postUrl ? ` · ${payload.postUrl}` : ""}`;
    }
    const response = await fetch("/api/admin/pinterest/publish", {
      method: "POST",
      headers,
      body: JSON.stringify({ libraryId: item.id }),
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      status?: string;
      pinId?: string;
      boardName?: string;
      error?: string;
    };
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Не удалось опубликовать в Pinterest");
    }
    markPublished(item.id, "pinterest", { pinterestPinId: payload.pinId || "" });
    return `${payload.status || "PUBLISHED"}${payload.boardName ? ` · доска «${payload.boardName}»` : ""}${
      payload.pinId ? ` · ${pinterestPinUrl(payload.pinId)}` : ""
    }`;
  }

  async function publishToTikTok(item: AdminVideoLibraryItem) {
    if (item.published?.tiktok || cardBusy(item.id)) return;
    setPublishingKey(`tiktok:${item.id}`);
    setNotice(null);
    try {
      const detail = await publishVideoTo(item, "tiktok");
      setNotice({
        type: "ok",
        text:
          detail === "PROCESSING"
            ? "TikTok принял видео · публикация продолжается"
            : `Опубликовано в TikTok · ${detail}`,
      });
      await load(true);
    } catch (publishError) {
      setNotice({ type: "error", text: publishError instanceof Error ? publishError.message : "Ошибка публикации" });
    } finally {
      setPublishingKey("");
    }
  }

  async function publishToMeta(item: AdminVideoLibraryItem, target: "instagram" | "facebook") {
    if (item.published?.[target] || cardBusy(item.id)) return;
    setPublishingKey(`${target}:${item.id}`);
    setNotice(null);
    try {
      const detail = await publishVideoTo(item, target);
      setNotice({ type: "ok", text: `Опубликовано в ${platformLabel(target)} · ${detail}` });
    } catch (publishError) {
      setNotice({ type: "error", text: publishError instanceof Error ? publishError.message : "Ошибка публикации" });
    } finally {
      setPublishingKey("");
    }
  }

  async function publishToThreads(item: AdminVideoLibraryItem) {
    if (item.published?.threads || cardBusy(item.id)) return;
    setPublishingKey(`threads:${item.id}`);
    setNotice(null);
    try {
      const detail = await publishVideoTo(item, "threads");
      setNotice({ type: "ok", text: `Опубликовано в Threads · ${detail}` });
    } catch (publishError) {
      setNotice({ type: "error", text: publishError instanceof Error ? publishError.message : "Ошибка публикации" });
      await load(true);
    } finally {
      setPublishingKey("");
    }
  }

  function openBlueskyPost(item: AdminVideoLibraryItem) {
    if (item.blueskyPostUrl) window.open(item.blueskyPostUrl, "_blank", "noopener,noreferrer");
  }

  async function publishToBluesky(item: AdminVideoLibraryItem) {
    if (item.published?.bluesky) {
      openBlueskyPost(item);
      return;
    }
    if (cardBusy(item.id)) return;
    setPublishingKey(`bluesky:${item.id}`);
    setNotice(null);
    try {
      const detail = await publishVideoTo(item, "bluesky");
      setNotice({ type: "ok", text: `Опубликовано в Bluesky · ${detail}` });
      await load(true);
    } catch (publishError) {
      setNotice({ type: "error", text: publishError instanceof Error ? publishError.message : "Ошибка публикации" });
      await load(true);
    } finally {
      setPublishingKey("");
    }
  }

  function openYouTubeVideo(item: AdminVideoLibraryItem) {
    if (item.youtubeVideoId) window.open(youtubeWatchUrl(item.youtubeVideoId), "_blank", "noopener,noreferrer");
  }

  function openPinterestPin(item: AdminVideoLibraryItem) {
    if (item.pinterestPinId) window.open(pinterestPinUrl(item.pinterestPinId), "_blank", "noopener,noreferrer");
  }

  async function publishToPinterest(item: AdminVideoLibraryItem) {
    if (item.published?.pinterest) {
      openPinterestPin(item);
      return;
    }
    if (cardBusy(item.id)) return;
    setPublishingKey(`pinterest:${item.id}`);
    setNotice(null);
    try {
      const detail = await publishVideoTo(item, "pinterest");
      setNotice({ type: "ok", text: `Опубликовано в Pinterest · ${detail}` });
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

  function openTumblrPost(item: AdminVideoLibraryItem) {
    if (item.tumblrPostUrl) window.open(item.tumblrPostUrl, "_blank", "noopener,noreferrer");
  }

  async function publishToTumblr(item: AdminVideoLibraryItem) {
    if (item.published?.tumblr) {
      openTumblrPost(item);
      return;
    }
    if (cardBusy(item.id)) return;
    setPublishingKey(`tumblr:${item.id}`);
    setNotice(null);
    try {
      const detail = await publishVideoTo(item, "tumblr");
      setNotice({ type: "ok", text: `Опубликовано в Tumblr · ${detail}` });
      await load(true);
    } catch (publishError) {
      setNotice({ type: "error", text: publishError instanceof Error ? publishError.message : "Ошибка публикации" });
      await load(true);
    } finally {
      setPublishingKey("");
    }
  }

  // Clicking YouTube opens the choice: publish now, or hand YouTube a
  // status.publishAt so it releases the video itself.
  function openYouTubeMenu(item: AdminVideoLibraryItem) {
    if (item.published?.youtube || item.youtubeState === "scheduled") {
      openYouTubeVideo(item);
      return;
    }
    setScheduleMode("youtube");
    setScheduleFor((current) => (current === item.id && scheduleMode === "youtube" ? "" : item.id));
    setScheduleAt(defaultScheduleValue());
  }

  // "All" no longer publishes straight away: it opens the same sheet as
  // YouTube, where the admin picks "now" or a moment for every network at once.
  function openAllMenu(item: AdminVideoLibraryItem) {
    if (cardBusy(item.id)) return;
    if (!batchScheduled(item) && !pendingPlatforms(item).length) return;
    setScheduleMode("all");
    setScheduleFor((current) => (current === item.id && scheduleMode === "all" ? "" : item.id));
    setScheduleAt(defaultScheduleValue());
  }

  async function markPublishedManually(item: AdminVideoLibraryItem, platform: Platform) {
    setPublishingKey(`manual:${platform}:${item.id}`);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/video-library/mark-published", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ libraryId: item.id, platform }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `Не удалось отметить ${platformLabel(platform)}`);
      }
      markPublished(item.id, platform);
      setScheduleFor("");
      setNotice({
        type: "ok",
        text: `${platformLabel(platform)} отмечено как добавлено вручную.`,
      });
      await load(true);
    } catch (markError) {
      setNotice({ type: "error", text: markError instanceof Error ? markError.message : "Ошибка" });
    } finally {
      setPublishingKey("");
    }
  }

  async function publishToYouTube(item: AdminVideoLibraryItem, publishAt = "") {
    if (item.published?.youtube || item.youtubeState === "scheduled" || cardBusy(item.id)) return;
    setScheduleFor("");
    setPublishingKey(`youtube:${item.id}`);
    setNotice(null);
    try {
      const detail = await publishVideoTo(item, "youtube", publishAt);
      if (detail.startsWith("SCHEDULED · ")) {
        setNotice({ type: "ok", text: `Запланировано на YouTube · ${detail.slice("SCHEDULED · ".length)}` });
      } else {
        setNotice({ type: "ok", text: `Загружено на YouTube · ${detail}` });
      }
      await load(true);
    } catch (publishError) {
      setNotice({ type: "error", text: publishError instanceof Error ? publishError.message : "Ошибка публикации" });
      await load(true);
    } finally {
      setPublishingKey("");
    }
  }

  async function publishToAll(item: AdminVideoLibraryItem) {
    const targets = pendingPlatforms(item);
    if (!targets.length || cardBusy(item.id)) return;
    setScheduleFor("");
    setNotice(null);
    setPublishingKey(`all:${item.id}`);
    const settled = await Promise.all(
      targets.map(async (platform) => {
        try {
          const detail = await publishVideoTo(item, platform);
          return { platform, ok: true as const, detail };
        } catch (publishError) {
          return {
            platform,
            ok: false as const,
            detail: publishError instanceof Error ? publishError.message : "ошибка",
          };
        }
      }),
    );
    setPublishingKey("");
    await load(true);
    const processing = settled
      .filter((entry) => entry.ok && entry.detail === "PROCESSING")
      .map((entry) => platformLabel(entry.platform));
    const ok = settled
      .filter((entry) => entry.ok && entry.detail !== "PROCESSING")
      .map((entry) => platformLabel(entry.platform));
    const failed = settled
      .filter((entry) => !entry.ok && (SHOW_PINTEREST_PUBLISH_ERRORS || entry.platform !== "pinterest"))
      .map((entry) => `${platformLabel(entry.platform)}: ${entry.detail}`);
    if (!failed.length) {
      const parts = [
        ...(ok.length ? [`Опубликовано: ${ok.join(", ")}`] : []),
        ...(processing.length ? [`Публикуется: ${processing.join(", ")}`] : []),
      ];
      setNotice(parts.length ? { type: "ok", text: parts.join(". ") } : null);
      return;
    }
    const progress = [
      ...(ok.length ? [`Опубликовано: ${ok.join(", ")}`] : []),
      ...(processing.length ? [`Публикуется: ${processing.join(", ")}`] : []),
    ];
    setNotice({
      type: "error",
      text: progress.length ? `${progress.join(". ")}. Ошибки — ${failed.join("; ")}` : failed.join("; "),
    });
  }

  // One moment for every pending network: YouTube takes it natively, the rest
  // go into the Firestore queue the cron worker drains.
  async function scheduleAllPlatforms(item: AdminVideoLibraryItem, publishAt: string) {
    const targets = pendingPlatforms(item);
    if (!targets.length || !publishAt || cardBusy(item.id)) return;
    setScheduleFor("");
    setNotice(null);
    setPublishingKey(`all:${item.id}`);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/video-library/schedule", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ libraryId: item.id, publishAt, platforms: targets }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        scheduledAt?: string;
        queued?: Platform[];
        youtubeScheduled?: boolean;
        failed?: { platform: Platform; error: string }[];
        error?: string;
      };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось запланировать");

      const planned = [
        ...(payload.youtubeScheduled ? [platformLabel("youtube")] : []),
        ...(payload.queued || []).map(platformLabel),
      ];
      const failed = (payload.failed || [])
        .filter((entry) => SHOW_PINTEREST_PUBLISH_ERRORS || entry.platform !== "pinterest")
        .map((entry) => `${platformLabel(entry.platform)}: ${entry.error}`);
      const when = payload.scheduledAt ? scheduleFormatter.format(new Date(payload.scheduledAt)) : "";
      if (failed.length) {
        setNotice({
          type: "error",
          text: planned.length
            ? `Запланировано на ${when}: ${planned.join(", ")}. Ошибки — ${failed.join("; ")}`
            : failed.join("; "),
        });
      } else {
        setNotice(planned.length ? { type: "ok", text: `Запланировано на ${when}: ${planned.join(", ")}` } : null);
      }
      await load(true);
    } catch (scheduleError) {
      setNotice({
        type: "error",
        text: scheduleError instanceof Error ? scheduleError.message : "Ошибка планирования",
      });
      await load(true);
    } finally {
      setPublishingKey("");
    }
  }

  async function cancelSchedule(item: AdminVideoLibraryItem) {
    if (!queuedPlatforms(item).length || cardBusy(item.id)) return;
    setScheduleFor("");
    setNotice(null);
    setPublishingKey(`all:${item.id}`);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/video-library/schedule", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ libraryId: item.id, cancel: true }),
      });
      const payload = (await response.json()) as { ok?: boolean; cancelled?: Platform[]; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось отменить");
      setNotice({
        type: "ok",
        text: `Планирование отменено: ${(payload.cancelled || []).map(platformLabel).join(", ")}`,
      });
      await load(true);
    } catch (cancelError) {
      setNotice({ type: "error", text: cancelError instanceof Error ? cancelError.message : "Ошибка отмены" });
      await load(true);
    } finally {
      setPublishingKey("");
    }
  }

  const publishActions = (item: AdminVideoLibraryItem) => {
    const busy = cardBusy(item.id);
    const remaining = pendingPlatforms(item);
    const allBusy = publishingKey === `all:${item.id}`;
    const queued = queuedPlatforms(item);
    const queuedNote = item.scheduledAt ? scheduleFormatter.format(new Date(item.scheduledAt)) : "";
    const scheduleError = visibleScheduleError(item.scheduleError);
    const scheduleFailed = item.scheduleStatus === "failed" && Boolean(scheduleError);
    return (
      <>
      <PublishIconButton
        platform="tiktok"
        published={Boolean(item.published?.tiktok)}
        scheduled={queued.includes("tiktok")}
        scheduledNote={queuedNote}
        processing={item.tiktokState === "publishing"}
        failed={item.tiktokState === "failed" || (scheduleFailed && item.scheduleError.includes("tiktok"))}
        failureNote={item.tiktokError || scheduleError}
        disabled={!tiktok?.connected || busy || queued.includes("tiktok") || item.tiktokState === "publishing"}
        busy={publishingKey === `tiktok:${item.id}` || (allBusy && remaining.includes("tiktok"))}
        onClick={() => void publishToTikTok(item)}
      />
      <PublishIconButton
        platform="instagram"
        published={Boolean(item.published?.instagram)}
        scheduled={queued.includes("instagram")}
        scheduledNote={queuedNote}
        failed={scheduleFailed && item.scheduleError.includes("instagram")}
        failureNote={scheduleError}
        disabled={!meta?.instagramReady || busy || queued.includes("instagram")}
        busy={publishingKey === `instagram:${item.id}` || (allBusy && remaining.includes("instagram"))}
        onClick={() => void publishToMeta(item, "instagram")}
      />
      <PublishIconButton
        platform="facebook"
        published={Boolean(item.published?.facebook)}
        scheduled={queued.includes("facebook")}
        scheduledNote={queuedNote}
        failed={scheduleFailed && item.scheduleError.includes("facebook")}
        failureNote={scheduleError}
        disabled={!meta?.facebookReady || busy || queued.includes("facebook")}
        busy={publishingKey === `facebook:${item.id}` || (allBusy && remaining.includes("facebook"))}
        onClick={() => void publishToMeta(item, "facebook")}
      />
      <PublishIconButton
        platform="threads"
        published={Boolean(item.published?.threads)}
        scheduled={queued.includes("threads")}
        scheduledNote={queuedNote}
        failed={item.threadsState === "failed"}
        failureNote={item.threadsError}
        disabled={!threads?.connected || item.threadsState === "publishing" || busy || queued.includes("threads")}
        busy={
          publishingKey === `threads:${item.id}` ||
          item.threadsState === "publishing" ||
          (allBusy && remaining.includes("threads"))
        }
        onClick={() => void publishToThreads(item)}
      />
      <PublishIconButton
        platform="bluesky"
        published={Boolean(item.published?.bluesky)}
        scheduled={queued.includes("bluesky")}
        scheduledNote={queuedNote}
        processing={item.blueskyState === "publishing"}
        failed={item.blueskyState === "failed" || (scheduleFailed && item.scheduleError.includes("bluesky"))}
        failureNote={item.blueskyError || scheduleError}
        openHint={item.published?.bluesky && item.blueskyPostUrl ? "открыть пост" : ""}
        disabled={
          busy ||
          item.blueskyState === "publishing" ||
          queued.includes("bluesky") ||
          (!bluesky?.ready && !item.published?.bluesky) ||
          (Boolean(item.published?.bluesky) && !item.blueskyPostUrl)
        }
        busy={
          publishingKey === `bluesky:${item.id}` ||
          item.blueskyState === "publishing" ||
          (allBusy && remaining.includes("bluesky"))
        }
        onClick={() => void publishToBluesky(item)}
      />
      <PublishIconButton
        platform="youtube"
        published={Boolean(item.published?.youtube)}
        scheduled={item.youtubeState === "scheduled"}
        scheduledNote={
          item.youtubeScheduledAt ? scheduleFormatter.format(new Date(item.youtubeScheduledAt)) : ""
        }
        failed={item.youtubeState === "failed"}
        failureNote={item.youtubeError}
        openHint={
          (item.published?.youtube || item.youtubeState === "scheduled") && item.youtubeVideoId
            ? "открыть видео"
            : ""
        }
        disabled={
          busy ||
          item.youtubeState === "uploading" ||
          (!youtube?.connected && !item.published?.youtube && item.youtubeState !== "scheduled") ||
          ((Boolean(item.published?.youtube) || item.youtubeState === "scheduled") && !item.youtubeVideoId)
        }
        busy={
          publishingKey === `youtube:${item.id}` ||
          item.youtubeState === "uploading" ||
          (allBusy && remaining.includes("youtube"))
        }
        onClick={() => openYouTubeMenu(item)}
      />
      <PublishIconButton
        platform="pinterest"
        published={Boolean(item.published?.pinterest)}
        scheduled={queued.includes("pinterest")}
        scheduledNote={queuedNote}
        failed={SHOW_PINTEREST_PUBLISH_ERRORS && item.pinterestState === "failed"}
        failureNote={SHOW_PINTEREST_PUBLISH_ERRORS ? item.pinterestError : ""}
        openHint={item.published?.pinterest && item.pinterestPinId ? "открыть пин" : ""}
        disabled={
          busy ||
          item.pinterestState === "publishing" ||
          queued.includes("pinterest") ||
          (!pinterest?.connected && !item.published?.pinterest) ||
          (Boolean(item.published?.pinterest) && !item.pinterestPinId)
        }
        busy={
          publishingKey === `pinterest:${item.id}` ||
          item.pinterestState === "publishing" ||
          (allBusy && remaining.includes("pinterest"))
        }
        onClick={() => void publishToPinterest(item)}
      />
      <PublishIconButton
        platform="tumblr"
        published={Boolean(item.published?.tumblr)}
        scheduled={queued.includes("tumblr")}
        scheduledNote={queuedNote}
        processing={item.tumblrState === "publishing"}
        failed={item.tumblrState === "failed" || (scheduleFailed && item.scheduleError.includes("tumblr"))}
        failureNote={item.tumblrError || scheduleError}
        openHint={item.published?.tumblr && item.tumblrPostUrl ? "открыть пост" : ""}
        disabled={
          busy ||
          item.tumblrState === "publishing" ||
          queued.includes("tumblr") ||
          (!tumblr?.connected && !item.published?.tumblr) ||
          (Boolean(item.published?.tumblr) && !item.tumblrPostUrl)
        }
        busy={
          publishingKey === `tumblr:${item.id}` ||
          item.tumblrState === "publishing" ||
          (allBusy && remaining.includes("tumblr"))
        }
        onClick={() => void publishToTumblr(item)}
      />
      <button
        type="button"
        title={
          batchScheduled(item)
            ? `Запланировано на ${scheduleNoteFor(item)}${
                queued.length ? ` · ${queued.map(platformLabel).join(", ")}` : ""
              } · нажмите, чтобы изменить`
            : remaining.length
              ? `Опубликовать сейчас или запланировать: ${remaining.map(platformLabel).join(", ")}`
              : "Уже опубликовано во все доступные сети"
        }
        aria-label="Опубликовать во все доступные сети или запланировать"
        disabled={busy || (!remaining.length && !batchScheduled(item))}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          openAllMenu(item);
        }}
        className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-35 ${
          batchScheduled(item) ? "bg-amber-500 text-white" : "bg-white/90 text-black"
        }`}
      >
        {busy ? "…" : "All"}
      </button>
      <DeleteVideoButton
        busy={deletingId === item.id}
        disabled={busy || item.scheduleStatus === "running"}
        onClick={() => void deleteVideo(item)}
      />
    </>
    );
  };

  if (view === "connections") {
    return (
      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-500">Connections</p>
            <h2 className="mt-1 text-2xl font-bold text-[var(--text)]">Подключения соцсетей</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              TikTok · Meta · Threads · Bluesky · YouTube · Pinterest · Tumblr
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void load()} className="text-sm font-semibold text-[var(--muted)] underline">
              Обновить
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
            <button
              type="button"
              disabled={resetting === "threads"}
              onClick={() => void resetConnection("threads")}
              className="rounded-full border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--text)] disabled:opacity-50"
            >
              {resetting === "threads" ? "Сбрасываем…" : "Reset Threads"}
            </button>
            <button
              type="button"
              disabled={connecting === "threads"}
              onClick={() => void connectThreads()}
              className="rounded-full bg-black px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {connecting === "threads" ? "Открываем Threads…" : threads?.connected ? "Reconnect Threads" : "Connect Threads"}
            </button>
            <button
              type="button"
              disabled={resetting === "youtube"}
              onClick={() => void resetConnection("youtube")}
              className="rounded-full border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--text)] disabled:opacity-50"
            >
              {resetting === "youtube" ? "Сбрасываем…" : "Reset YouTube"}
            </button>
            <button
              type="button"
              disabled={connecting === "youtube"}
              onClick={() => void connectYouTube()}
              className="rounded-full bg-[#FF0000] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {connecting === "youtube" ? "Открываем YouTube…" : youtube?.connected ? "Reconnect YouTube" : "Connect YouTube"}
            </button>
            <button
              type="button"
              disabled={resetting === "pinterest"}
              onClick={() => void resetConnection("pinterest")}
              className="rounded-full border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--text)] disabled:opacity-50"
            >
              {resetting === "pinterest" ? "Сбрасываем…" : "Reset Pinterest"}
            </button>
            <button
              type="button"
              disabled={connecting === "pinterest"}
              onClick={() => void connectPinterest()}
              className="rounded-full bg-[#E60023] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {connecting === "pinterest" ? "Открываем Pinterest…" : pinterest?.connected ? "Reconnect Pinterest" : "Connect Pinterest"}
            </button>
            <button
              type="button"
              disabled={resetting === "tumblr"}
              onClick={() => void resetConnection("tumblr")}
              className="rounded-full border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--text)] disabled:opacity-50"
            >
              {resetting === "tumblr" ? "Отключаем…" : "Disconnect Tumblr"}
            </button>
            <button
              type="button"
              disabled={connecting === "tumblr"}
              onClick={() => void connectTumblr()}
              className="rounded-full bg-[#001935] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {connecting === "tumblr" ? "Открываем Tumblr…" : tumblr?.connected ? "Reconnect Tumblr" : "Connect Tumblr"}
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_4%,transparent)] px-4 py-3 text-sm text-[var(--muted)]">
            {tiktok?.configured === false ? (
              <span>
                TikTok: нужен серверный <code className="text-[var(--text)]">BUFFER_API_KEY</code>
              </span>
            ) : tiktok?.connected ? (
              <span>
                TikTok — Ready{tiktok.channel ? ` · @${tiktok.channel}` : ""}
                {tiktok.usedLast24h != null && tiktok.remainingLast24h != null
                  ? ` · Buffer ${tiktok.usedLast24h} / ${tiktok.dailyLimit} за 24 ч · осталось ${tiktok.remainingLast24h}`
                  : ` · лимит Buffer: ${tiktok.dailyLimit} видео / 24 ч`}
                . Buffer вызывается только при публикации.
              </span>
            ) : (
              <span>TikTok недоступен{tiktok?.error ? `: ${tiktok.error}` : ""}</span>
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
          <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_4%,transparent)] px-4 py-3 text-sm text-[var(--muted)]">
            {threads?.configured === false ? (
              <span>
                Threads env: <code className="text-[var(--text)]">THREADS_APP_ID</code>,{" "}
                <code className="text-[var(--text)]">THREADS_APP_SECRET</code>
                {threads.redirectUri ? (
                  <>
                    {" "}
                    · Redirect URI: <code className="text-[var(--text)]">{threads.redirectUri}</code>
                  </>
                ) : null}
              </span>
            ) : threads?.connected ? (
              <span>
                Threads подключён{threads.username ? ` · @${threads.username}` : ""}
                {threads.scope ? ` · scopes: ${threads.scope}` : ""}
              </span>
            ) : (
              <span>Threads ещё не подключён. Нажмите Connect Threads и авторизуйте @get.dreamly.</span>
            )}
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_4%,transparent)] px-4 py-3 text-sm text-[var(--muted)]">
            {youtube?.configured === false ? (
              <span>
                YouTube env: <code className="text-[var(--text)]">YOUTUBE_CLIENT_ID</code>,{" "}
                <code className="text-[var(--text)]">YOUTUBE_CLIENT_SECRET</code>
                {youtube.redirectUri ? (
                  <>
                    {" "}
                    · Redirect URI: <code className="text-[var(--text)]">{youtube.redirectUri}</code>
                  </>
                ) : null}
              </span>
            ) : youtube?.connected ? (
              <span>
                YouTube подключён{youtube.channelTitle ? ` · ${youtube.channelTitle}` : youtube.channelId ? ` · ${youtube.channelId}` : ""}
                {youtube.privacyStatus ? ` · загрузка как ${youtube.privacyStatus}` : ""}
              </span>
            ) : (
              <span>YouTube ещё не подключён. Нажмите Connect YouTube и выберите канал Dreamly.</span>
            )}
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_4%,transparent)] px-4 py-3 text-sm text-[var(--muted)]">
            {bluesky?.configured === false ? (
              <span>
                Bluesky env: <code className="text-[var(--text)]">BLUESKY_HANDLE</code>,{" "}
                <code className="text-[var(--text)]">BLUESKY_APP_PASSWORD</code>
              </span>
            ) : bluesky?.ready ? (
              <span>
                Bluesky — Connected / Ready{bluesky.handle ? ` · @${bluesky.handle}` : ""}
                {bluesky.remainingDailyVideos !== null ? ` · осталось видео сегодня: ${bluesky.remainingDailyVideos}` : ""}
              </span>
            ) : bluesky?.connected ? (
              <span>Bluesky подключён, но не готов к видео{bluesky.error ? `: ${bluesky.error}` : ""}</span>
            ) : (
              <span>Bluesky недоступен{bluesky?.error ? `: ${bluesky.error}` : ""}</span>
            )}
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_4%,transparent)] px-4 py-3 text-sm text-[var(--muted)]">
            {pinterest?.configured === false ? (
              <span>
                Pinterest env: <code className="text-[var(--text)]">PINTEREST_APP_ID</code>,{" "}
                <code className="text-[var(--text)]">PINTEREST_APP_SECRET</code>
                {pinterest.redirectUri ? (
                  <>
                    {" "}
                    · Redirect URI: <code className="text-[var(--text)]">{pinterest.redirectUri}</code>
                  </>
                ) : null}
              </span>
            ) : pinterest?.connected ? (
              <span>
                Pinterest подключён{pinterest.username ? ` · @${pinterest.username}` : ""}
                {` · прямая публикация · доска «${pinterest.boardName || PINTEREST_BOARD_NAME}»`}
              </span>
            ) : (
              <span>
                Pinterest ещё не подключён. Нажмите Connect Pinterest и авторизуйте @getdreamly — пины уходят напрямую на доску «
                {PINTEREST_BOARD_NAME}», без Instagram.
              </span>
            )}
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_4%,transparent)] px-4 py-3 text-sm text-[var(--muted)]">
            {tumblr?.configured === false ? (
              <span>
                Tumblr env: <code className="text-[var(--text)]">TUMBLR_CLIENT_ID</code>,{" "}
                <code className="text-[var(--text)]">TUMBLR_CLIENT_SECRET</code>
                {tumblr.redirectUri ? (
                  <>
                    {" "}
                    · Redirect URI: <code className="text-[var(--text)]">{tumblr.redirectUri}</code>
                  </>
                ) : null}
              </span>
            ) : tumblr?.connected ? (
              <span>
                Tumblr подключён{tumblr.userName ? ` · @${tumblr.userName}` : ""}
                {tumblr.blogTitle || tumblr.blogName ? ` · блог «${tumblr.blogTitle || tumblr.blogName}»` : ""}
                {tumblr.blogUrl ? (
                  <>
                    {" "}
                    ·{" "}
                    <a href={tumblr.blogUrl} target="_blank" rel="noreferrer" className="underline">
                      {tumblr.blogUrl}
                    </a>
                  </>
                ) : null}
                {tumblr.tokenHealthy ? " · refresh token на месте" : " · нет refresh token, переподключите"}
                {tumblr.blogAmbiguous && tumblr.blogs.length > 1
                  ? ` · блогов несколько (${tumblr.blogs.map((blog) => blog.identifier).join(", ")}) — можно закрепить через TUMBLR_BLOG_IDENTIFIER`
                  : ""}
              </span>
            ) : (
              <span>
                Tumblr ещё не подключён. Нажмите Connect Tumblr — видео уходят в блог напрямую через официальный API,
                без Buffer и других посредников.
              </span>
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
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-500">Video library</p>
          <h2 className="mt-1 text-2xl font-bold text-[var(--text)]">Все сгенерированные видео</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Free Video · Free Mix · Sora · Combined · Veo · {items.length} готовых
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="text-sm font-semibold text-[var(--muted)] underline">
          Обновить
        </button>
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
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="aspect-square animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--text)_8%,transparent)]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
          Готовых видео пока нет.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <VideoTile
              key={item.id}
              item={item}
              dateLabel={dateFormatter.format(new Date(item.createdAt))}
              scheduledNote={
                queuedPlatforms(item).length && item.scheduledAt
                  ? `ALL ${scheduleFormatter.format(new Date(item.scheduledAt))}`
                  : item.youtubeState === "scheduled" && item.youtubeScheduledAt
                    ? `YT ${scheduleFormatter.format(new Date(item.youtubeScheduledAt))}`
                    : ""
              }
              actions={publishActions(item)}
            />
          ))}
        </div>
      )}
      {scheduleItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setScheduleFor("")}
        >
          <div
            className="w-[min(92vw,26rem)] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p
              className={`text-xs font-bold uppercase tracking-[0.16em] ${
                scheduleMode === "all" ? "text-violet-500" : "text-[#FF0000]"
              }`}
            >
              {scheduleMode === "all" ? "Все сети" : "YouTube"}
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-bold text-[var(--text)]">{scheduleItem.title}</p>

            {scheduleMode === "all" ? (
              <>
                {pendingPlatforms(scheduleItem).length ? (
                  <p className="mt-2 text-[11px] leading-4 text-[var(--muted)]">
                    {pendingPlatforms(scheduleItem).map(platformLabel).join(" · ")}
                  </p>
                ) : null}

                {batchScheduled(scheduleItem) ? (
                  <div className="mt-3 rounded-xl border border-amber-500/60 bg-amber-500/10 p-3">
                    <p className="text-xs font-bold text-amber-600">
                      Уже запланировано на {scheduleNoteFor(scheduleItem)}
                    </p>
                    {queuedPlatforms(scheduleItem).length ? (
                      <p className="mt-1 text-[11px] leading-4 text-amber-600/90">
                        {queuedPlatforms(scheduleItem).map(platformLabel).join(", ")}
                      </p>
                    ) : null}
                    {queuedPlatforms(scheduleItem).length ? (
                      <button
                        type="button"
                        onClick={() => void cancelSchedule(scheduleItem)}
                        className="mt-2 w-full rounded-full border border-amber-500/70 px-4 py-2 text-xs font-bold text-amber-600"
                      >
                        Отменить планирование
                      </button>
                    ) : null}
                    {scheduleItem.youtubeState === "scheduled" ? (
                      <p className="mt-2 text-[11px] leading-4 text-[var(--muted)]">
                        YouTube отменяется только в YouTube Studio.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {scheduleItem.scheduleStatus === "failed" && visibleScheduleError(scheduleItem.scheduleError) ? (
                  <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-[11px] leading-4 text-red-500">
                    Прошлое расписание не отработало — {visibleScheduleError(scheduleItem.scheduleError)}
                  </p>
                ) : null}

                <button
                  type="button"
                  disabled={!pendingPlatforms(scheduleItem).length}
                  onClick={() => void publishToAll(scheduleItem)}
                  className="mt-4 w-full rounded-full bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                >
                  Опубликовать сейчас
                </button>

                <div className="mt-4 rounded-xl border border-[var(--border)] p-3">
                  <p className="text-xs font-semibold text-[var(--muted)]">Или выбрать дату и время</p>
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    min={minScheduleValue()}
                    onChange={(event) => setScheduleAt(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
                  />
                  <button
                    type="button"
                    disabled={!scheduleAt || !pendingPlatforms(scheduleItem).length}
                    onClick={() => void scheduleAllPlatforms(scheduleItem, localInputToIso(scheduleAt))}
                    className="mt-2 w-full rounded-full border border-amber-500/70 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-600 disabled:opacity-40"
                  >
                    Запланировать все сети
                  </button>
                  <p className="mt-2 text-[11px] leading-4 text-[var(--muted)]">
                    YouTube планируется нативно, остальные сети публикует наш планировщик в это же время. Время уходит
                    в Positioner сразу — со статусом «Запланировано».
                  </p>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void publishToYouTube(scheduleItem)}
                  className="mt-4 w-full rounded-full bg-[#FF0000] px-4 py-2.5 text-sm font-bold text-white"
                >
                  Опубликовать сейчас
                </button>

                <div className="mt-4 rounded-xl border border-[var(--border)] p-3">
                  <p className="text-xs font-semibold text-[var(--muted)]">Или выбрать дату и время</p>
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    min={minScheduleValue()}
                    onChange={(event) => setScheduleAt(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
                  />
                  <button
                    type="button"
                    disabled={!scheduleAt}
                    onClick={() => void publishToYouTube(scheduleItem, localInputToIso(scheduleAt))}
                    className="mt-2 w-full rounded-full border border-amber-500/70 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-600 disabled:opacity-40"
                  >
                    Запланировать
                  </button>
                  <p className="mt-2 text-[11px] leading-4 text-[var(--muted)]">
                    Запланированное видео загружается как private, публикацию в назначенное время делает сам YouTube.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={publishingKey === `manual:youtube:${scheduleItem.id}`}
                  onClick={() => void markPublishedManually(scheduleItem, "youtube")}
                  className="mt-3 w-full rounded-full border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--text)] disabled:opacity-50"
                >
                  {publishingKey === `manual:youtube:${scheduleItem.id}` ? "Сохраняем…" : "Added manually"}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setScheduleFor("")}
              className="mt-3 w-full text-xs font-semibold text-[var(--muted)] underline"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
