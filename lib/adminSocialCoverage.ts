import type { TikTokConnectionStatus } from "./adminTikTok";
import type { MetaConnectionStatus } from "./adminMeta";
import type { ThreadsConnectionStatus } from "./adminThreads";
import type { BlueskyConnectionStatus } from "./adminBluesky";
import type { YouTubeConnectionStatus } from "./adminYouTube";
import type { PinterestConnectionStatus } from "./adminPinterest";
import type { TumblrConnectionStatus } from "./adminTumblr";

export type SocialCoverageState = "ready" | "limited" | "missing" | "planned" | "skipped";
export type SocialConnectionKind = "direct" | "buffer" | "none";

export type SocialCoverageRow = {
  id: string;
  platform: string;
  state: SocialCoverageState;
  stateLabel: string;
  connected: boolean;
  connectionKind: SocialConnectionKind;
  connection: string;
  account: string;
  remaining: string;
  candidate: boolean;
};

export type SocialCoverageInput = {
  tiktok?: TikTokConnectionStatus | null;
  meta?: MetaConnectionStatus | null;
  threads?: ThreadsConnectionStatus | null;
  bluesky?: BlueskyConnectionStatus | null;
  youtube?: YouTubeConnectionStatus | null;
  pinterest?: PinterestConnectionStatus | null;
  tumblr?: TumblrConnectionStatus | null;
};

function account(value: string, prefix = "@") {
  const clean = String(value || "").trim();
  if (!clean) return "—";
  return prefix && !clean.startsWith(prefix) ? `${prefix}${clean}` : clean;
}

function row(input: Omit<SocialCoverageRow, "stateLabel">): SocialCoverageRow {
  const stateLabel = {
    ready: "Готово",
    limited: "Ограничено",
    missing: "Не подключено",
    planned: "Позже",
    skipped: "Не нужно",
  }[input.state];
  return { ...input, stateLabel };
}

export function buildSocialCoverageRows(status: SocialCoverageInput): SocialCoverageRow[] {
  const instagramReady = Boolean(status.meta?.connected && status.meta.instagramReady);
  const facebookReady = Boolean(status.meta?.connected && status.meta.facebookReady);
  const blueskyReady = Boolean(status.bluesky?.ready);
  const tumblrReady = Boolean(status.tumblr?.connected && status.tumblr.tokenHealthy);

  return [
    row({
      id: "tiktok",
      platform: "TikTok",
      state: status.tiktok?.connected ? "ready" : "missing",
      connected: Boolean(status.tiktok?.connected),
      connectionKind: "buffer",
      connection: "Через Buffer",
      account: account(status.tiktok?.channel || ""),
      remaining: status.tiktok?.connected
        ? "Ничего"
        : status.tiktok?.configured === false
          ? "Добавить BUFFER_API_KEY"
          : status.tiktok?.error || "Проверить канал TikTok в Buffer",
      candidate: false,
    }),
    row({
      id: "instagram",
      platform: "Instagram Reels",
      state: instagramReady ? "ready" : status.meta?.connected ? "limited" : "missing",
      connected: instagramReady,
      connectionKind: "direct",
      connection: "Напрямую · Meta Graph API",
      account: account(status.meta?.igUsername || status.meta?.igUserId || ""),
      remaining: instagramReady
        ? "Ничего"
        : status.meta?.connected
          ? "Привязать professional Instagram к Facebook Page"
          : "Подключить Meta OAuth",
      candidate: false,
    }),
    row({
      id: "facebook",
      platform: "Facebook Reels",
      state: facebookReady ? "ready" : status.meta?.connected ? "limited" : "missing",
      connected: facebookReady,
      connectionKind: "direct",
      connection: "Напрямую · Meta Graph API",
      account: account(status.meta?.pageName || status.meta?.pageId || "", ""),
      remaining: facebookReady
        ? "Ничего"
        : status.meta?.connected
          ? "Выбрать Facebook Page с правами публикации"
          : "Подключить Meta OAuth",
      candidate: false,
    }),
    row({
      id: "threads",
      platform: "Threads",
      state: status.threads?.connected ? "ready" : "missing",
      connected: Boolean(status.threads?.connected),
      connectionKind: "direct",
      connection: "Напрямую · Threads API",
      account: account(status.threads?.username || status.threads?.userId || ""),
      remaining: status.threads?.connected ? "Ничего" : "Подключить Threads OAuth",
      candidate: false,
    }),
    row({
      id: "bluesky",
      platform: "Bluesky",
      state: blueskyReady ? "ready" : status.bluesky?.connected ? "limited" : "missing",
      connected: Boolean(status.bluesky?.connected),
      connectionKind: "direct",
      connection: "Напрямую · AT Protocol",
      account: account(status.bluesky?.handle || ""),
      remaining: blueskyReady
        ? status.bluesky?.remainingDailyVideos == null
          ? "Ничего"
          : `Доступно сегодня: ${status.bluesky.remainingDailyVideos} видео`
        : status.bluesky?.error || "Добавить handle и app password",
      candidate: false,
    }),
    row({
      id: "youtube",
      platform: "YouTube Shorts",
      state: status.youtube?.connected ? "ready" : "missing",
      connected: Boolean(status.youtube?.connected),
      connectionKind: "direct",
      connection: "Напрямую · YouTube Data API",
      account: account(status.youtube?.channelTitle || status.youtube?.channelId || "", ""),
      remaining: status.youtube?.connected
        ? `Ничего · режим: ${status.youtube.privacyStatus || "public"}`
        : "Подключить Google OAuth и канал",
      candidate: false,
    }),
    row({
      id: "pinterest",
      platform: "Pinterest",
      state: status.pinterest?.connected ? "limited" : "missing",
      connected: Boolean(status.pinterest?.connected),
      connectionKind: "direct",
      connection: "Напрямую · Pinterest API v5",
      account: status.pinterest?.connected
        ? `${account(status.pinterest.username)} · «${status.pinterest.boardName || "Dream meanings"}»`
        : "—",
      remaining: status.pinterest?.connected
        ? "Получить Standard Access для production-публикации"
        : "Подключить Pinterest OAuth, затем получить Standard Access",
      candidate: false,
    }),
    row({
      id: "tumblr",
      platform: "Tumblr",
      state: tumblrReady ? "ready" : status.tumblr?.connected ? "limited" : "missing",
      connected: Boolean(status.tumblr?.connected),
      connectionKind: "direct",
      connection: "Напрямую · Tumblr API v2",
      account: status.tumblr?.connected
        ? [account(status.tumblr.userName), status.tumblr.blogTitle || status.tumblr.blogName]
            .filter((value) => value && value !== "—")
            .join(" · ") || "—"
        : "—",
      remaining: tumblrReady
        ? "Ничего"
        : status.tumblr?.connected
          ? "Переподключить OAuth: нужен рабочий refresh token"
          : "Подключить Tumblr OAuth",
      candidate: false,
    }),
    row({
      id: "vimeo",
      platform: "Vimeo",
      state: "skipped",
      connected: false,
      connectionKind: "none",
      connection: "Не подключён",
      account: "—",
      remaining: "Не подключать: по текущему плану не нужен",
      candidate: true,
    }),
    row({
      id: "linkedin",
      platform: "LinkedIn",
      state: "planned",
      connected: false,
      connectionKind: "none",
      connection: "Не подключён",
      account: "—",
      remaining: "Позже: сначала определить формат без AI-slop",
      candidate: true,
    }),
  ];
}

