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

export function scoreSearchCandidate(
  query: string,
  candidate: { title: string; slug: string; aliases: string[] },
) {
  const normalizedQuery = normalizeMatchText(query);
  if (!normalizedQuery) return 0;

  const title = normalizeMatchText(candidate.title);
  const slug = normalizeMatchText(candidate.slug);
  const aliases = candidate.aliases.map(normalizeMatchText);

  if (
    title === normalizedQuery ||
    slug === normalizedQuery ||
    aliases.some((alias) => alias === normalizedQuery)
  ) {
    return 4;
  }
  if (
    startsWithSearchText(title, normalizedQuery) ||
    startsWithSearchText(slug, normalizedQuery)
  ) {
    return 3;
  }
  if (
    isUsefulContainedSlug(normalizedQuery, slug) ||
    aliases.some(
      (alias) =>
        containsWholePhrase(alias, normalizedQuery) ||
        containsWholePhrase(normalizedQuery, alias),
    )
  ) {
    return 2;
  }
  if (
    containsWholePhrase(title, normalizedQuery) ||
    containsWholePhrase(slug, normalizedQuery)
  ) {
    return 1;
  }
  return 0;
}
