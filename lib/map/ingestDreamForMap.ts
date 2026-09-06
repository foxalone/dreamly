// lib/map/ingestDreamForMap.ts
export type MapIngestSourceType = "dream" | "story";

async function postIngest(params: {
  uid: string;
  dreamId: string;
  sourceType?: MapIngestSourceType;
  skipCity?: boolean;
}) {
  const resp = await fetch("/api/map/ingest-dream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid: params.uid,
      dreamId: params.dreamId,
      sourceType: params.sourceType ?? "dream",
      ...(params.skipCity ? { skipCity: true } : {}),
    }),
    keepalive: true,
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error ?? "Failed to ingest dream for map");
  return data as {
    ok: true;
    skipped?: boolean;
    cityId?: string;
    dateKey?: string;
    sourceType?: MapIngestSourceType;
    citySource?: "ip" | "item" | "user";
  };
}

export async function ingestDreamForMap(params: {
  uid: string;
  dreamId: string;
  sourceType?: MapIngestSourceType;
  skipCity?: boolean;
}) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await postIngest(params);
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Failed to ingest dream for map");
}
