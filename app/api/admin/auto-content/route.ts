import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { enqueueAutoDictionaryBatch, enqueueAutoDictionaryContent, nextAutoPublishSlots, previewAutoDictionaryContent, requestLocalWorkerWake } from "@/app/api/admin/_lib/autoContent";
import { AUTO_PAIR_COUNT } from "@/lib/adminAutoSlots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
  if (message === "NO_UNUSED_DICTIONARY_ENTRY") {
    return NextResponse.json({ error: "Все символы словаря уже использованы" }, { status: 409 });
  }
  if (message === "PAID_IMAGE_DISABLED") {
    return NextResponse.json({ error: "Платная генерация картинок выключена" }, { status: 403 });
  }
  if (message === "DAILY_JOB_LIMIT") {
    return NextResponse.json({ error: "Дневной лимит картинок исчерпан" }, { status: 429 });
  }
  if (message === "DAILY_BUDGET_LIMIT") {
    return NextResponse.json({ error: "Дневной бюджет картинок был бы превышен" }, { status: 429 });
  }
  if (message === "SLUG_ALREADY_RESERVED") {
    return NextResponse.json({ error: "Этот символ уже взят в работу" }, { status: 409 });
  }
  if (status === 500) console.error("[admin/auto-content]", error);
  return NextResponse.json({ error: status === 500 ? "Unable to prepare auto content" : message }, { status });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const [preview, slots] = await Promise.all([previewAutoDictionaryContent(), nextAutoPublishSlots()]);
    return NextResponse.json({ preview, slots });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const uid = await requireAdmin(request);
    const payload = (await request.json().catch(() => ({}))) as {
      sendToTelegram?: unknown;
      imageProvider?: unknown;
      catchUp?: unknown;
      count?: unknown;
    };
    const options = {
      createdBy: uid,
      sendToTelegram: payload.sendToTelegram !== false,
      imageProvider: "veo" as const,
    };
    await requestLocalWorkerWake(uid, payload.catchUp === true ? "catch-up" : "single");
    if (payload.catchUp === true) {
      const count = Number(payload.count);
      const result = await enqueueAutoDictionaryBatch({
        ...options,
        count: Number.isFinite(count) && count > 0 ? count : AUTO_PAIR_COUNT,
      });
      return NextResponse.json(result, { status: 201 });
    }
    const result = await enqueueAutoDictionaryContent(options);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
