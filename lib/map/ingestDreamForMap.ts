// lib/map/ingestDreamForMap.ts
export async function ingestDreamForMap(params: { uid: string; dreamId: string }) {
  const resp = await fetch("/api/map/ingest-dream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error ?? "Failed to ingest dream for map");
  return data as { ok: true; skipped?: boolean; cityId?: string; dateKey?: string };
}