import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { fetchYouTubeVideoDetails } from "@/app/api/admin/youtube/_lib";
import { getDreamEntry } from "@/lib/dream-dictionary";
import { DREAM_PAGE_VIDEO_COLLECTION, parseYouTubeId, youtubeThumbnail, youtubeWatchPageUrl, type DreamPageVideo } from "@/lib/dreamPageVideo";
import { LOCALES } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/path";
import { notifyIndexNow } from "@/lib/indexnow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
  if (status === 500) console.error("[admin/dream-page-video]", error);
  return NextResponse.json({ error: status === 500 ? "Unable to update page video" : message }, { status });
}

function readSlug(value: unknown) {
  const slug = typeof value === "string" ? value.trim() : "";
  return slug && getDreamEntry(slug) ? slug : "";
}

/** The dictionary page is ISR (24 h): re-render it in every locale right away. */
async function refreshPages(slug: string) {
  const paths = LOCALES.map((locale) => localePath(`/dreams/${slug}`, locale));
  for (const path of paths) revalidatePath(path);
  try {
    await notifyIndexNow(paths, { reason: "page-video" });
  } catch (error) {
    console.warn("[indexnow:page-video]", error instanceof Error ? error.message : error);
  }
}

/** oEmbed needs no key and confirms the video exists and is embeddable. */
async function oembed(youtubeId: string) {
  const response = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(youtubeWatchPageUrl(youtubeId))}`,
    { cache: "no-store", signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as { title?: string; thumbnail_url?: string };
  return { title: String(payload.title || ""), thumbnailUrl: String(payload.thumbnail_url || "") };
}

export async function PUT(request: Request) {
  try {
    const uid = await requireAdmin(request);
    const payload = (await request.json()) as Record<string, unknown>;
    const slug = readSlug(payload.slug);
    if (!slug) return NextResponse.json({ error: "Unknown symbol" }, { status: 400 });
    const youtubeId = parseYouTubeId(String(payload.url ?? ""));
    if (!youtubeId) return NextResponse.json({ error: "Это не ссылка на видео YouTube" }, { status: 400 });

    const [details, embed] = await Promise.all([fetchYouTubeVideoDetails(youtubeId), oembed(youtubeId)]);
    if (!details && !embed) {
      return NextResponse.json(
        { error: "YouTube не отдаёт это видео: проверь, что оно публичное (или «по ссылке») и что встраивание разрешено" },
        { status: 409 },
      );
    }
    const now = new Date().toISOString();
    const video: DreamPageVideo = {
      slug,
      youtubeId,
      title: details?.title || embed?.title || "",
      description: (details?.description || "").slice(0, 2_000),
      thumbnailUrl: details?.thumbnailUrl || embed?.thumbnailUrl || youtubeThumbnail(youtubeId),
      uploadDate: details?.publishedAt || now,
      duration: details?.duration || "",
    };
    await adminDb().collection(DREAM_PAGE_VIDEO_COLLECTION).doc(slug).set({
      ...video,
      assignedBy: uid,
      assignedAt: FieldValue.serverTimestamp(),
    });
    await refreshPages(slug);
    return NextResponse.json({ video });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
    const slug = readSlug(new URL(request.url).searchParams.get("slug"));
    if (!slug) return NextResponse.json({ error: "Unknown symbol" }, { status: 400 });
    await adminDb().collection(DREAM_PAGE_VIDEO_COLLECTION).doc(slug).delete();
    await refreshPages(slug);
    return NextResponse.json({ video: null });
  } catch (error) {
    return apiError(error);
  }
}
