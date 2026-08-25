import {
  BUFFER_API_URL,
  BUFFER_TIKTOK_CHANNEL_DOCUMENT,
  bufferApiKey,
  bufferConfigured,
  bufferRateLimitMessage,
  bufferTikTokReadiness,
  bufferTikTokUsername,
  isBufferRateLimitMessage,
  type TikTokConnectionStatus,
} from "@/lib/adminTikTok";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { loadLibraryVideo } from "@/app/api/admin/_lib/libraryVideo";

type BufferGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

type BufferChannel = {
  id?: string;
  name?: string;
  displayName?: string;
  service?: string;
};

type BufferPost = {
  id?: string;
  status?: string;
  text?: string;
  sharedNow?: boolean;
  error?: { message?: string } | null;
};

function channelCacheRef() {
  return adminDb().doc(BUFFER_TIKTOK_CHANNEL_DOCUMENT);
}

function normalizeHandle(value: string) {
  return String(value || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

async function bufferGraphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const apiKey = bufferApiKey();
  if (!apiKey) {
    throw new Error("BUFFER_API_KEY is not configured");
  }

  const response = await fetch(BUFFER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(variables ? { query, variables } : { query }),
    cache: "no-store",
  });

  if (response.status === 429) {
    throw new Error(bufferRateLimitMessage(response.headers.get("Retry-After")));
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Buffer API key is invalid or expired. Create a new Personal Access Key and update BUFFER_API_KEY.",
    );
  }

  const payload = (await response.json().catch(() => ({}))) as BufferGraphqlResponse<T>;
  if (!response.ok) {
    const message =
      payload.errors?.map((entry) => entry.message).filter(Boolean).join("; ") || `Buffer HTTP ${response.status}`;
    if (response.status === 429 || isBufferRateLimitMessage(message)) {
      throw new Error(bufferRateLimitMessage(response.headers.get("Retry-After")));
    }
    throw new Error(message);
  }
  if (payload.errors?.length) {
    const message = payload.errors.map((entry) => entry.message).filter(Boolean).join("; ") || "Buffer GraphQL error";
    if (isBufferRateLimitMessage(message)) {
      throw new Error(bufferRateLimitMessage());
    }
    if (/unauthorized|invalid.?token|expired|api.?key/i.test(message)) {
      throw new Error(
        "Buffer API key is invalid or expired. Create a new Personal Access Key and update BUFFER_API_KEY.",
      );
    }
    throw new Error(message);
  }
  if (!payload.data) throw new Error("Buffer returned an empty response");
  return payload.data;
}

async function listOrganizations() {
  const data = await bufferGraphql<{
    account?: { organizations?: Array<{ id?: string; name?: string }> };
  }>(`query GetOrganizations {
    account {
      organizations {
        id
        name
      }
    }
  }`);
  return (data.account?.organizations || []).filter((org) => org.id);
}

async function listChannels(organizationId: string) {
  const data = await bufferGraphql<{ channels?: BufferChannel[] }>(
    `query GetChannels($organizationId: OrganizationId!) {
      channels(input: { organizationId: $organizationId }) {
        id
        name
        displayName
        service
      }
    }`,
    { organizationId },
  );
  return data.channels || [];
}

function pickTikTokChannel(channels: BufferChannel[], preferred: string) {
  const tiktokChannels = channels.filter((channel) => String(channel.service || "").toLowerCase() === "tiktok");
  if (tiktokChannels.length === 0) return null;

  const exact =
    tiktokChannels.find((channel) => normalizeHandle(channel.name || "") === preferred) ||
    tiktokChannels.find((channel) => normalizeHandle(channel.displayName || "") === preferred) ||
    tiktokChannels.find((channel) => normalizeHandle(channel.name || "").includes(preferred)) ||
    tiktokChannels.find((channel) => normalizeHandle(channel.displayName || "").includes(preferred));

  return exact || (tiktokChannels.length === 1 ? tiktokChannels[0] : null);
}

export async function resolveTikTokBufferChannel(options?: { forceRefresh?: boolean }) {
  const preferred = bufferTikTokUsername();
  if (!options?.forceRefresh) {
    const cached = await channelCacheRef().get();
    if (cached.exists) {
      const data = cached.data() as { channelId?: string; channelName?: string };
      if (data.channelId) {
        return {
          channelId: String(data.channelId),
          channelName: String(data.channelName || preferred),
        };
      }
    }
  }

  const organizations = await listOrganizations();
  if (organizations.length === 0) {
    throw new Error("No Buffer organization found for this API key");
  }

  let matched: BufferChannel | null = null;
  for (const org of organizations) {
    const channels = await listChannels(String(org.id));
    matched = pickTikTokChannel(channels, preferred);
    if (matched?.id) break;
  }

  if (!matched?.id) {
    throw new Error("TikTok channel is not connected in Buffer.");
  }

  const channelName = normalizeHandle(matched.name || matched.displayName || preferred) || preferred;
  await channelCacheRef().set(
    {
      channelId: matched.id,
      channelName,
      service: "tiktok",
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  return { channelId: matched.id, channelName };
}

export function getTikTokStatus(): TikTokConnectionStatus {
  return bufferTikTokReadiness();
}

function mapBufferStatus(status: string | undefined): "publishing" | "published" | "failed" {
  const value = String(status || "").toLowerCase();
  if (value === "sent") return "published";
  if (value === "error") return "failed";
  // draft / needs_approval / scheduled / sending
  return "publishing";
}

async function waitForBufferPost(postId: string) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 1_500 : 3_000));
    const data = await bufferGraphql<{ post?: BufferPost }>(
      `query GetPost($id: PostId!) {
        post(input: { id: $id }) {
          id
          status
          sharedNow
          error { message }
        }
      }`,
      { id: postId },
    );
    const post = data.post;
    const mapped = mapBufferStatus(post?.status);
    if (mapped === "published") {
      return { status: "published" as const, bufferStatus: String(post?.status || "sent"), error: "" };
    }
    if (mapped === "failed") {
      throw new Error(post?.error?.message || "TikTok publish failed via Buffer");
    }
  }
  return { status: "publishing" as const, bufferStatus: "sending", error: "" };
}

export async function publishLibraryVideoToTikTok(libraryId: string, adminUid: string) {
  if (!bufferConfigured()) {
    throw new Error("BUFFER_API_KEY is not configured");
  }

  const video = await loadLibraryVideo(libraryId);
  if (!/^https:\/\//i.test(video.videoUrl)) {
    throw new Error("Library video is missing a public HTTPS URL");
  }

  const channel = await resolveTikTokBufferChannel();

  const mutation = `mutation CreateTikTokPost($input: CreatePostInput!) {
    createPost(input: $input) {
      ... on PostActionSuccess {
        post {
          id
          status
          sharedNow
          error { message }
        }
      }
      ... on MutationError {
        message
      }
    }
  }`;

  const input = {
    text: video.caption,
    channelId: channel.channelId,
    schedulingType: "automatic",
    mode: "shareNow",
    assets: [
      {
        video: {
          url: video.videoUrl,
          metadata: { thumbnailOffset: 1000 },
        },
      },
    ],
    metadata: {
      tiktok: {
        isAiGenerated: true,
      },
    },
    aiAssisted: true,
  };

  let createResult: {
    createPost?: {
      post?: BufferPost;
      message?: string;
    };
  };

  try {
    createResult = await bufferGraphql(mutation, { input });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Buffer publish failed";
    if (isBufferRateLimitMessage(message)) {
      throw new Error(message.includes("rate-limited TikTok publishing") ? message : bufferRateLimitMessage());
    }
    throw error;
  }

  const payload = createResult.createPost;
  if (payload?.message) {
    if (/channel|tiktok|disconnected|not found/i.test(payload.message)) {
      await channelCacheRef().delete().catch(() => undefined);
      throw new Error(`TikTok channel is not connected in Buffer. (${payload.message})`);
    }
    throw new Error(payload.message);
  }

  const post = payload?.post;
  const postId = String(post?.id || "");
  if (!postId) throw new Error("Buffer did not return a post id");

  let final = {
    status: mapBufferStatus(post?.status),
    bufferStatus: String(post?.status || ""),
    error: post?.error?.message || "",
  };

  if (final.status === "failed") {
    throw new Error(final.error || "TikTok publish failed via Buffer");
  }

  if (final.status !== "published") {
    final = await waitForBufferPost(postId);
  }

  const publishMeta = {
    tiktokPublishedAt: new Date().toISOString(),
    tiktokPublishedBy: adminUid,
    tiktokStatus: final.status,
    tiktokError: final.error || "",
    tiktokProvider: "buffer",
    bufferPostId: postId,
    bufferChannelId: channel.channelId,
    bufferStatus: final.bufferStatus,
  };
  await adminDb().collection(video.collection).doc(video.jobId).set(publishMeta, { merge: true });

  return {
    publishId: postId,
    status: final.status === "published" ? "PUBLISH_COMPLETE" : "PROCESSING",
    bufferStatus: final.bufferStatus,
    title: video.title,
    caption: video.caption,
    channel: channel.channelName,
  };
}
