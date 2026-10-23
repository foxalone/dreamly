export function normalizeMatchText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function startsWithSearchText(value: string, query: string) {
  const normalizedValue = normalizeMatchText(value);
  const normalizedQuery = normalizeMatchText(query);
  return !!normalizedQuery && normalizedValue.startsWith(normalizedQuery);
}

export function containsWholePhrase(value: string, phrase: string) {
  const normalizedValue = normalizeMatchText(value);
  const normalizedPhrase = normalizeMatchText(phrase);
  if (!normalizedValue || !normalizedPhrase) return false;

  return ` ${normalizedValue} `.includes(` ${normalizedPhrase} `);
}

export function isUsefulContainedSlug(query: string, slug: string) {
  const normalizedSlug = normalizeMatchText(slug);
  const compactSlugLength = normalizedSlug.replaceAll(" ", "").length;
  return compactSlugLength >= 4 && containsWholePhrase(query, normalizedSlug);
}

export function prepareSearchCandidate(candidate: { title: string; slug: string; aliases: string[] }) {
  return {
    title: normalizeMatchText(candidate.title),
    slug: normalizeMatchText(candidate.slug),
    aliases: candidate.aliases.map(normalizeMatchText),
  };
}

/** Both query and candidate are normalized; bulk lookups can reuse the prepared index. */
export function scorePreparedSearchCandidate(
  normalizedQuery: string,
  candidate: ReturnType<typeof prepareSearchCandidate>,
) {
  if (!normalizedQuery) return 0;
  const { title, slug, aliases } = candidate;
  if (title === normalizedQuery || slug === normalizedQuery || aliases.includes(normalizedQuery)) return 4;
  if (title.startsWith(normalizedQuery) || slug.startsWith(normalizedQuery)) return 3;
  const contains = (value: string, phrase: string) => Boolean(value && phrase && ` ${value} `.includes(` ${phrase} `));
  if ((slug.replaceAll(" ", "").length >= 4 && contains(normalizedQuery, slug))
    || aliases.some((alias) => contains(alias, normalizedQuery) || contains(normalizedQuery, alias))) return 2;
  if (contains(title, normalizedQuery) || contains(slug, normalizedQuery)) return 1;
  return 0;
}

export function scoreSearchCandidate(
  query: string,
  candidate: { title: string; slug: string; aliases: string[] },
) {
  return scorePreparedSearchCandidate(normalizeMatchText(query), prepareSearchCandidate(candidate));
}
