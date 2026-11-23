import { after, NextResponse } from "next/server";
import { beginImage, claimWebImageReward, createImageAttempt, DreamImageError, imageStatus, markImageAdPlayed, readImage, setImagePublication, validImageId } from "@/lib/dreamImage";
import { requireSignedInUid } from "../../_lib/requireUser";

export const runtime = "nodejs";
export const maxDuration = 120;
const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ id: string }> };

function reply(data: object, status = 200) {
  return NextResponse.json(data, { status, headers });
}

function failure(error: unknown) {
  return error instanceof DreamImageError ? reply({ code: error.code }, error.status) : reply({ code: "IMAGE_UNAVAILABLE" }, 503);
}

async function owner(request: Request, context: Context) {
  const { id } = await context.params;
  if (!validImageId(id)) return { error: reply({ code: "DREAM_NOT_FOUND" }, 404) };
  const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  return { id, ...await requireSignedInUid(token) };
}

export async function GET(request: Request, context: Context) {
  const user = await owner(request, context);
  if (user.error) return user.error;
  try {
    if (new URL(request.url).searchParams.get("image") === "1") {
      const image = await readImage(user.uid, user.id);
      return new Response(new Uint8Array(image), { headers: { ...headers, "Content-Type": "image/webp" } });
    }
    return reply(await imageStatus(user.uid, user.id));
  } catch (error) { return failure(error); }
}

export async function POST(request: Request, context: Context) {
  const user = await owner(request, context);
  if (user.error) return user.error;
  try {
    const body = await request.json().catch(() => null);
    if (body?.action === "attempt" && (body.platform === "web" || body.platform === "android")) {
      return reply(await createImageAttempt(user.uid, user.id, body.platform));
    }
    if (body?.action === "start" && (body.attemptId === undefined || validImageId(body.attemptId))) {
      const result = await beginImage(user.uid, user.id, body.attemptId);
      if (result.work) after(result.work);
      return reply({ state: result.state });
    }
    if (body?.action === "reward" && validImageId(body.attemptId)) {
      const result = await claimWebImageReward(user.uid, user.id, body.attemptId);
      if (result.work) after(result.work);
      return reply({ state: result.state });
    }
    if (body?.action === "played" && validImageId(body.attemptId)) {
      await markImageAdPlayed(user.uid, user.id, body.attemptId);
      return reply(await imageStatus(user.uid, user.id));
    }
    if (body?.action === "publish" && typeof body.published === "boolean") {
      return reply(await setImagePublication(user.uid, user.id, body.published));
    }
    return reply({ code: "INVALID_REQUEST" }, 400);
  } catch (error) { return failure(error); }
}
