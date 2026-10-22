export type PublicLunarDream = { id: string; text: string; sharedAtMs: number; emojis: string[] };
export type PublicDreamRow = { id: string; data: Record<string, unknown> };

/** Explicit public allowlist. Deleted shells, stories and duplicate shares stay out. */
export function lunarPublicDreams(rows: PublicDreamRow[]): PublicLunarDream[] {
  const seen = new Set<string>();
  return [...rows].sort((a, b) => Number(b.data.sharedAtMs || 0) - Number(a.data.sharedAtMs || 0)).flatMap(({ id, data }) => {
    const text = typeof data.text === "string" ? data.text.trim() : "";
    if (!text || data.deleted === true || data.sourceType === "story" || data.ownerStoryId) return [];
    const key = String(data.ownerDreamId || id);
    if (seen.has(key)) return [];
    seen.add(key);
    const emojis = [...new Set((Array.isArray(data.emojis) ? data.emojis : []).flatMap(item => {
      const value = typeof item === "string" ? item : item?.native;
      return typeof value === "string" && value.length > 0 && value.length <= 32 ? [value] : [];
    }))];
    const timestamp = Number(data.sharedAtMs);
    return [{ id, text, sharedAtMs: Number.isFinite(timestamp) && timestamp > 0 && timestamp <= 8.64e15 ? timestamp : 0, emojis }];
  });
}

export function lunarDreamSummary(dreams: PublicLunarDream[]) {
  const frequencies = new Map<string, number>();
  for (const dream of dreams) for (const emoji of dream.emojis) frequencies.set(emoji, (frequencies.get(emoji) ?? 0) + 1);
  return {
    topEmojis: [...frequencies].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([emoji]) => emoji),
    latest: dreams[0] ? { id: dreams[0].id, snippet: dreams[0].text.slice(0, 240) + (dreams[0].text.length > 240 ? "…" : "") } : null,
  };
}
