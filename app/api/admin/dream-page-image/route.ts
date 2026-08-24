import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { AI_IMAGE_COLLECTION } from "@/lib/adminAiImage";
import { DREAM_PAGE_IMAGE_COLLECTION, dreamPageImageAlt } from "@/lib/dreamPageImage";
import { getDreamEntry } from "@/lib/dream-dictionary";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
  if (status === 500) console.error("[admin/dream-page-image]", error);
  return NextResponse.json({ error: status === 500 ? "Unable to update page image" : message }, { status });
}

function readSlug(value: unknown) {
  const slug = typeof value === "string" ? value.trim() : "";
  if (!slug || !getDreamEntry(slug)) return "";
  return slug;
}

function revalidateDreamPage(slug: string) {
  revalidatePath(`/dreams/${slug}`);
  revalidatePath("/sitemap.xml");
}

export async function PUT(request: Request) {
  try {
    const uid = await requireAdmin(request);
    const payload = (await request.json()) as Record<string, unknown>;
    const slug = readSlug(payload.slug);
    const imageJobId = typeof payload.imageJobId === "string" ? payload.imageJobId.trim() : "";
    if (!slug) return NextResponse.json({ error: "Unknown symbol" }, { status: 400 });
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(imageJobId)) {
      return NextResponse.json({ error: "Invalid image id" }, { status: 400 });
    }

    const jobSnapshot = await adminDb().collection(AI_IMAGE_COLLECTION).doc(imageJobId).get();
    const job = jobSnapshot.data() as { status?: string; imageUrl?: string; subject?: string } | undefined;
    const imageUrl = String(job?.imageUrl || "");
    if (!jobSnapshot.exists || job?.status !== "completed" || !imageUrl) {
      return NextResponse.json({ error: "Image is not ready" }, { status: 409 });
    }

    const subject = String(job.subject || "");
    await adminDb().collection(DREAM_PAGE_IMAGE_COLLECTION).doc(slug).set({
      slug,
      imageJobId,
      imageUrl,
      subject,
      assignedBy: uid,
      assignedAt: FieldValue.serverTimestamp(),
    });
    revalidateDreamPage(slug);

    return NextResponse.json({
      image: {
        slug,
        imageJobId,
        imageUrl,
        subject,
        alt: dreamPageImageAlt(getDreamEntry(slug)?.name || subject),
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
    const slug = readSlug(new URL(request.url).searchParams.get("slug"));
    if (!slug) return NextResponse.json({ error: "Unknown symbol" }, { status: 400 });
    await adminDb().collection(DREAM_PAGE_IMAGE_COLLECTION).doc(slug).delete();
    revalidateDreamPage(slug);
    return NextResponse.json({ image: null });
  } catch (error) {
    return apiError(error);
  }
}
