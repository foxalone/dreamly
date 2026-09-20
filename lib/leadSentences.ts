/**
 * Splits prose after the first `count` sentences so an inline call-to-action can sit
 * inside the paragraph. Pure string work, safe for server components.
 *
 * Boundaries are ". ! ? ؟ …" followed by optional closing quotes/brackets and whitespace.
 * Skipped: abbreviations (e.g., a.m., Dr.), single-letter initials, decimals, anything inside
 * a `[label](/href)` markup pair, and a "sentence" that continues with a lowercase letter.
 */
const ABBREVIATIONS = new Set([
  "e.g", "i.e", "etc", "vs", "cf", "ca", "approx", "no", "vol", "ch", "fig", "st", "mt",
  "dr", "mr", "mrs", "ms", "prof", "sr", "jr", "a.m", "p.m",
  // es / pt
  "p.ej", "ej", "sra", "sras", "srs", "ex", "pág", "pag", "núm", "num",
  // de
  "z.b", "bzw", "usw", "ggf", "u.a", "d.h", "evtl", "bspw", "nr", "jh",
  // ru
  "т.е", "т.д", "т.п", "др", "напр", "см", "ср", "тыс", "г", "гг", "в", "вв", "им", "ул",
]);

const TERMINATORS = new Set([".", "!", "?", "؟", "…"]);
const CLOSERS = new Set(['"', "”", "’", "'", ")", "]", "»", "「", "」"]);

function isLowercaseLetter(ch: string) {
  return ch.toLowerCase() === ch && ch.toUpperCase() !== ch;
}

function lastToken(text: string, end: number) {
  let start = end;
  while (start > 0 && /[\p{L}\p{M}\p{N}.]/u.test(text[start - 1])) start -= 1;
  return text.slice(start, end);
}

export function splitLeadSentences(text: string, count = 2): { lead: string; rest: string } {
  const source = text ?? "";
  if (count <= 0 || !source.trim()) return { lead: source, rest: "" };

  let found = 0;
  let depth = 0; // inside [label](/href)
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "[") depth += 1;
    else if (ch === "]" && depth > 0) depth -= 1;
    else if (ch === ")" && depth < 0) depth = 0;

    if (!TERMINATORS.has(ch) || depth > 0) {
      i += 1;
      continue;
    }

    // Consume a run of terminators ("?!", "...").
    let j = i;
    while (j < source.length && TERMINATORS.has(source[j])) j += 1;
    while (j < source.length && CLOSERS.has(source[j])) j += 1;

    // A markdown link's "(" right after "]" is not a sentence boundary.
    if (source[j] === "(" && source[j - 1] === "]") {
      i = j;
      continue;
    }

    if (j >= source.length || !/\s/.test(source[j])) {
      i = j;
      continue;
    }

    let k = j;
    while (k < source.length && /\s/.test(source[k])) k += 1;
    if (k >= source.length) break;

    const next = source[k];
    const token = lastToken(source, i).replace(/\.+$/, "").toLowerCase();
    const isAbbrev = ch === "." && (ABBREVIATIONS.has(token) || /^\p{L}$/u.test(token));
    const continuesLower = isLowercaseLetter(next);
    const tokenIsNumberOnly = ch === "." && /^\p{N}+$/u.test(token) && continuesLower;

    if (!isAbbrev && !continuesLower && !tokenIsNumberOnly) {
      found += 1;
      if (found === count) {
        return { lead: source.slice(0, j).trimEnd(), rest: source.slice(k) };
      }
    }
    i = k;
  }

  return { lead: source, rest: "" };
}
