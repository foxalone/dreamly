// YouTube upload kit for videos dima uploads by hand (YouTube 16:9): one text
// block with everything the YouTube Studio upload form asks for.

const TAGS_LIMIT = 500; // YouTube Studio: total characters in the Tags field

export function youtubeTagsLine(tags) {
  const out = [];
  let length = 0;
  for (const tag of Array.isArray(tags) ? tags : []) {
    const clean = String(tag).replace(/[<>,]/g, " ").replace(/\s+/g, " ").trim();
    if (!clean || out.includes(clean)) continue;
    const added = (out.length ? 2 : 0) + clean.length;
    if (length + added > TAGS_LIMIT) break;
    out.push(clean);
    length += added;
  }
  return out.join(", ");
}

export function buildYoutubeKit({ topic, metadata, videoUrl = "", thumbnailUrl = "", durationSeconds = 0 }) {
  const m = metadata ?? {};
  const hashtags = (m.hashtags ?? []).map((tag) => `#${String(tag).replace(/^#/, "")}`).join(" ");
  const duration = durationSeconds ? `${Math.floor(durationSeconds / 60)}:${String(Math.round(durationSeconds % 60)).padStart(2, "0")}` : "";
  const block = (label, value) => (value ? `${label}\n${value}\n` : "");
  return [
    `YOUTUBE UPLOAD KIT — ${topic}${duration ? ` (${duration})` : ""}`,
    "",
    block("VIDEO FILE", videoUrl),
    block("THUMBNAIL (1280x720 JPG)", thumbnailUrl),
    block("TITLE", m.title),
    block("DESCRIPTION", m.description),
    block("TAGS (paste into the Tags field)", youtubeTagsLine(m.tags)),
    block("HASHTAGS", hashtags),
    block("PINNED COMMENT", m.pinnedComment),
    block("CATEGORY", m.category),
    block("THUMBNAIL TEXT", m.thumbnailText),
    "SETTINGS",
    "- Audience: No, it's not made for kids",
    "- Video language: English · captions: English (auto)",
    "- Chapters: already in the description (Show chapters: on)",
    "- Visibility: Public, or Schedule",
  ].filter((line) => line !== "").join("\n");
}
