import { NextResponse } from "next/server";
import { readForwardedIp, resolveIpCity } from "@/lib/geo/resolveIpCity";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const geo = await resolveIpCity(req);
    if (!geo) {
      return NextResponse.json(
        { ok: false, error: "Could not resolve city from IP", ip: readForwardedIp(req) || null },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, ...geo });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "IP city lookup failed" },
      { status: 500 }
    );
  }
}
