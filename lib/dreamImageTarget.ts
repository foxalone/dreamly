import { ALL_DREAM_ENTRIES, getDreamEntry, type DreamEntry } from "@/lib/dream-dictionary";
import { scoreSearchCandidate } from "@/lib/searchMatching";
import { firstInterpretationSentence, subjectToDreamSlug } from "@/lib/socialImageCaption";

export { subjectToDreamSlug };

export function findDreamEntryFromSubject(subject: string): DreamEntry | undefined {
  const trimmed = String(subject || "").trim();
  if (!trimmed) return undefined;

  const slugGuess = subjectToDreamSlug(trimmed);
  const direct = slugGuess ? getDreamEntry(slugGuess) : undefined;
  if (direct) return direct;

  let best: DreamEntry | undefined;
  let bestScore = 0;
  for (const entry of ALL_DREAM_ENTRIES) {
    const score = scoreSearchCandidate(trimmed, {
      title: entry.name,
      slug: entry.slug,
      aliases: entry.aliases,
    });
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  // Only exact / prefix matches — contained-word hits like "snake" inside a
  // combo subject would send traffic to the wrong dictionary page.
  return bestScore >= 3 ? best : undefined;
}

export function interpretationLead(entry: DreamEntry | undefined) {
  const intro = entry?.sections.introduction?.[0] || entry?.shortMeaning || "";
  return firstInterpretationSentence(intro);
}
