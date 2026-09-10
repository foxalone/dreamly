import { PRIMARY_ADMIN_UID } from "@/app/api/admin/_lib/auth";
import { adminAuth } from "@/app/api/admin/_lib/firebaseAdmin";
import { youtubeConfigured } from "@/lib/adminYouTube";
import { publishLibraryVideoToYouTube } from "@/app/api/admin/youtube/_lib";

const PRODUCTION_YOUTUBE_PUBLISH_URL = "https://dreamly.art/api/admin/youtube/publish";

async function mintAdminIdToken() {
  const apiKey = String(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
  if (!apiKey) throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY");
  const customToken = await adminAuth().createCustomToken(PRIMARY_ADMIN_UID);
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      cache: "no-store",
    },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    idToken?: string;
    error?: { message?: string };
  };
  if (!response.ok || !payload.idToken) {
    throw new Error(payload.error?.message || "Failed to mint admin ID token for YouTube");
  }
  return payload.idToken;
}

async function publishYouTubeViaProduction(libraryId: string, publishAt: string) {
  const token = await mintAdminIdToken();
  const response = await fetch(PRODUCTION_YOUTUBE_PUBLISH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ libraryId, publishAt }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `YouTube HTTP ${response.status}`);
  }
  return payload;
}

export async function scheduleAutoYouTube(libraryId: string, publishAt: string, createdBy: string) {
  if (youtubeConfigured()) {
    return publishLibraryVideoToYouTube(libraryId, createdBy, publishAt);
  }
  return publishYouTubeViaProduction(libraryId, publishAt);
}
