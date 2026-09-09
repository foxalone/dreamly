import { ALL_DREAM_ENTRIES, PARENT_DREAMS, POPULAR_DREAM_SLUGS, type DreamEntry } from "@/lib/dream-dictionary";
import { findDreamEntryFromSubject } from "@/lib/dreamImageTarget";
import { dictionarySlugFor } from "@/lib/gscVideoMatch";

export const AUTO_USED_SLUGS_COLLECTION = "adminUsedDictionarySlugs";
export const AUTO_CONTENT_CREATED_BY = "auto-dictionary";

export function videoTopicForEntry(entry: DreamEntry) {
  return entry.title;
}

export function imageSubjectForEntry(entry: DreamEntry) {
  return entry.name;
}

export function collectUsedSlugs(inputs: {
  topics?: Array<string | null | undefined>;
  subjects?: Array<string | null | undefined>;
  slugs?: Array<string | null | undefined>;
}) {
  const used = new Set<string>();
  for (const slug of inputs.slugs ?? []) {
    const cleaned = String(slug || "").trim();
    if (cleaned) used.add(cleaned);
  }
  for (const topic of inputs.topics ?? []) {
    const slug = dictionarySlugFor(String(topic || ""));
    if (slug) used.add(slug);
  }
  for (const subject of inputs.subjects ?? []) {
    const text = String(subject || "").trim();
    if (!text) continue;
    const fromSubject = findDreamEntryFromSubject(text);
    if (fromSubject) used.add(fromSubject.slug);
    const fromMatch = dictionarySlugFor(text);
    if (fromMatch) used.add(fromMatch);
  }
  return used;
}

export function pickUnusedDictionaryEntry(usedSlugs: Iterable<string>): DreamEntry {
  const used = new Set(usedSlugs);
  const unusedParents = PARENT_DREAMS.filter((entry) => !used.has(entry.slug));
  for (const slug of POPULAR_DREAM_SLUGS) {
    const hit = unusedParents.find((entry) => entry.slug === slug);
    if (hit) return hit;
  }
  if (unusedParents.length > 0) {
    return [...unusedParents].sort((left, right) => left.slug.localeCompare(right.slug))[0];
  }
  const unusedVariations = ALL_DREAM_ENTRIES
    .filter((entry) => Boolean(entry.parentSlug) && !used.has(entry.slug))
    .sort((left, right) => left.slug.localeCompare(right.slug));
  if (unusedVariations[0]) return unusedVariations[0];
  throw new Error("NO_UNUSED_DICTIONARY_ENTRY");
}

export function autoContentPreview(entry: DreamEntry) {
  return {
    slug: entry.slug,
    title: entry.title,
    topic: videoTopicForEntry(entry),
    subject: imageSubjectForEntry(entry),
    pagePath: `/dreams/${entry.slug}`,
  };
}
