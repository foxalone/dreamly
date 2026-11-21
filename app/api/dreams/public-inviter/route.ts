import { NextResponse } from "next/server";
import { adminDb } from "../../admin/_lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const uid = new URL(request.url).searchParams.get("from") ?? "";
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) {
    return NextResponse.json({ code: "INVITER_NOT_FOUND" }, { status: 404 });
  }

  try {
    const db = adminDb();
    const [profile] = await db.getAll(db.collection("users").doc(uid), {
      fieldMask: ["displayName", "photoURL"],
    });
    if (!profile.exists) {
      return NextResponse.json({ code: "INVITER_NOT_FOUND" }, { status: 404 });
    }

    const data = profile.data();
    const name = typeof data?.displayName === "string" ? data.displayName.trim() : "";
    let photoURL: string | null = null;
    if (typeof data?.photoURL === "string" && data.photoURL.length <= 2048) {
      try {
        const photo = new URL(data.photoURL);
        if (photo.protocol === "https:" && !photo.username && !photo.password) photoURL = photo.href;
      } catch {
        // An invalid legacy photo is shown as the default avatar.
      }
    }

    return NextResponse.json({
      displayName: name && !name.includes("@") ? name.slice(0, 120) : null,
      photoURL,
    }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } });
  } catch {
    return NextResponse.json({ code: "INVITE_UNAVAILABLE" }, { status: 503 });
  }
}
