export type GuestSharedEntry = {
  id: string;
  sharedAtMs: number;
  text: string;
  deleted?: boolean;
};

/** A guest may have several dreams, so a share must match this dream. */
export function matchingGuestFeedEntries(
  dream: { sharedId?: string; text?: string },
  entries: readonly GuestSharedEntry[],
): GuestSharedEntry[] {
  const active = entries.filter((entry) => entry.deleted !== true);
  if (dream.sharedId) {
    const byId = active.filter((entry) => entry.id === dream.sharedId);
    if (byId.length) return byId;
  }
  const text = (dream.text ?? "").trim();
  return text ? active.filter((entry) => entry.text === text) : [];
}
