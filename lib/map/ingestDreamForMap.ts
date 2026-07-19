// lib/map/ingestDreamForMap.ts
export type MapIngestSourceType = "dream" | "story";

export async function ingestDreamForMap(params: {
  uid: string;
  dreamId: string;
  sourceType?: MapIngestSourceType;
}) {
  const resp = await fetch("/api/map/ingest-dream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid: params.uid,
      dreamId: params.dreamId,
      sourceType: params.sourceType ?? "dream",
    }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error ?? "Failed to ingest dream for map");
  return data as {
    ok: true;
    skipped?: boolean;
    cityId?: string;
    dateKey?: string;
    sourceType?: MapIngestSourceType;
  };
}
