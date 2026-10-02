/**
 * Two-letter avatar initials for the public feed. Computed at share time from
 * the author's email (preferred) or display name, so the public shared_dreams
 * doc never has to carry the email or name itself — Firestore ships every
 * field of that doc to any reader, rendered or not.
 */
export function authorInitials(email?: string | null, name?: string | null): string | null {
  const src = (email ?? "").trim() || (name ?? "").trim();
  if (!src) return null;
  const left = src.includes("@") ? src.split("@")[0] : src;
  const parts = left.split(/[\s._-]+/).filter(Boolean);
  const a = (parts[0]?.[0] ?? "").toUpperCase();
  const b = (parts[1]?.[0] ?? parts[0]?.[1] ?? "").toUpperCase();
  return (a + b).slice(0, 2) || null;
}
