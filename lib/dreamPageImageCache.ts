import { createHash } from "node:crypto";
import { LOCALES } from "./i18n/config";
import { localePath } from "./i18n/path";

/** Only fields consumed by HTML, metadata, or the gallery order. */
export function dreamPageImageFingerprint(data: Record<string, unknown> | undefined): string | null {
  if (!data?.imageUrl) return null;
  const assignedAt = data.assignedAt as { toDate?: () => Date } | string | undefined;
  return createHash("sha256").update(JSON.stringify([
    data.imageUrl, data.imageJobId || "", data.subject || "",
    typeof assignedAt === "string" ? assignedAt : assignedAt?.toDate?.().toISOString() || "",
  ])).digest("hex");
}

export function dreamPageImagePaths(slugs: string[]): string[] {
  if (!slugs.length) return [];
  return [...new Set([
    ...slugs.flatMap((slug) => LOCALES.map((locale) => localePath(`/dreams/${slug}`, locale))),
    ...LOCALES.map((locale) => localePath("/gallery", locale)),
    "/sitemap.xml",
  ])];
}

export function changedDreamPageImages(
  previous: Record<string, string | null>, current: Record<string, string | null>,
): string[] {
  return [...new Set([...Object.keys(previous), ...Object.keys(current)])]
    .filter((slug) => (previous[slug] ?? null) !== (current[slug] ?? null));
}
