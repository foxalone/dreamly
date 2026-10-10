import "server-only";

import { cache } from "react";
import type { Metadata } from "next";

import { adminFirestore } from "@/lib/firebaseAdmin";
import { SITE_URL, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";
import { localePath } from "@/lib/i18n/path";

import DreamPageClient, { type PublicSharedDream } from "./DreamPageClient";

/**
 * Public, indexable page of one shared dream: /dream/<id> (+ locale prefixes).
 * The id is the shared_dreams doc id — stable for the dream's lifetime, so
 * Google can index each dream once. Deleted dreams (stripped docs with
 * deleted:true) and empty texts 404 — same policy as the feed.
 */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeEmojiNatives(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v
      .map((item) => {
        if (!item) return "";
        if (typeof item === "string") return item.trim();
        if (typeof item === "object")
          return String(item.native ?? item.emoji ?? item.icon ?? item.value ?? "").trim();
        return "";
      })
      .filter(Boolean)
      .slice(0, 8);
  }
  if (typeof v === "string") return v.trim().split(/\s+/).filter(Boolean).slice(0, 8);
  return [];
}

export const loadSharedDream = cache(async (id: string): Promise<PublicSharedDream | null> => {
  if (!id || !/^[A-Za-z0-9_-]{1,120}$/.test(id)) return null;
  try {
    const snap = await adminFirestore().collection("shared_dreams").doc(id).get();
    if (!snap.exists) return null;
    const data = snap.data() as any;
    if (data?.deleted === true) return null;
    const text = str(data?.text).trim();
    if (!text) return null;

    return {
      id,
      text,
      lang: str(data?.lang).trim().toLowerCase() || null,
      sourceType: data?.sourceType === "story" ? "story" : "dream",
      source: data?.source === "voice" ? "voice" : "manual",
      dateKey: str(data?.dateKey),
      timeKey: str(data?.timeKey),
      sharedAtMs: num(data?.sharedAtMs) || null,
      shareBadge: str(data?.shareBadge) || null,
      fromGuest: data?.fromGuest === true || !!str(data?.ownerGuestId),
      authorInitials: str(data?.authorInitials ?? "") || str(data?.authorEmail ?? "") || str(data?.authorName ?? ""),
      emojis: normalizeEmojiNatives(data?.emojis),
      reactions: {
        heart: num(data?.reactions?.heart),
        like: num(data?.reactions?.like),
        star: num(data?.reactions?.star),
      },
      commentCount: num(data?.commentCount),
    };
  } catch (e) {
    console.error("loadSharedDream failed:", e);
    return null;
  }
});

export function sharedDreamExcerpt(text: string, max: number): string {
  const s = (text ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trimEnd()}…`;
}

export function sharedDreamMetadata(dream: PublicSharedDream, id: string, locale: Locale): Metadata {
  const t = getMessages(locale);
  const titleCore = sharedDreamExcerpt(dream.text, 60) || t.dreamPage.metaTitleFallback;
  const title = `${titleCore} | Dreamly`;
  const description = sharedDreamExcerpt(dream.text, 158) || t.dreamPage.metaDescription;
  const path = `/dream/${id}`;
  return {
    title,
    description,
    ...localeMetadata(path, locale),
    openGraph: localeOpenGraph(path, locale, title, description, "article"),
  };
}

export default function DreamPublicView({
  dream,
  locale,
}: {
  dream: PublicSharedDream;
  locale: Locale;
}) {
  const t = getMessages(locale);

  // UGC page markup for search engines: an anonymous forum-style posting with
  // its comment count. The text itself is in the HTML (client components are
  // server-rendered), so this only adds structure.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: sharedDreamExcerpt(dream.text, 110),
    articleBody: dream.text,
    url: `${SITE_URL}${localePath(`/dream/${dream.id}`, locale)}`,
    ...(dream.sharedAtMs ? { datePublished: new Date(dream.sharedAtMs).toISOString() } : {}),
    author: { "@type": "Person", name: t.shareBadges.anonymous },
    commentCount: dream.commentCount,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/CommentAction",
      userInteractionCount: dream.commentCount,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <DreamPageClient dream={dream} />
    </>
  );
}
