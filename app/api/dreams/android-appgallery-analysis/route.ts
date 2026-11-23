import { NextResponse } from "next/server";
import { AppGalleryAnalysisRequest, androidRewardTarget } from "../_lib/androidReward";
import { POST as analyze } from "../analyze/route";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const target = body && typeof body === "object" ? androidRewardTarget(body) : null;
  if (target?.action !== "analysis" || (body.idToken != null && typeof body.idToken !== "string")) {
    return NextResponse.json({ code: "INVALID_REQUEST" }, { status: 400 });
  }
  return analyze(new AppGalleryAnalysisRequest(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ ...target.payload, idToken: body.idToken }),
  }));
}
