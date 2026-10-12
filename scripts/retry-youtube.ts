import { AUTO_CONTENT_CREATED_BY } from "../lib/adminAutoDictionary";
import { scheduleAutoYouTube } from "../app/api/admin/_lib/youtubeRemote";

/**
 * Re-run only the YouTube upload for library videos whose nightly booking already
 * scheduled the social networks but lost YouTube (expired token, quota, outage).
 * Uploads via production when local YouTube credentials are absent, exactly like
 * the nightly cycle (youtubeRemote.scheduleAutoYouTube).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/retry-youtube.ts \
 *     "free:<videoJobId>@<publishAtISO>" ["free:<videoJobId>@<publishAtISO>" ...]
 */
async function main() {
  const pairs = process.argv.slice(2).filter((argument) => argument.includes("@"));
  if (!pairs.length) {
    console.error('usage: npx tsx --env-file=.env.local scripts/retry-youtube.ts "free:<videoJobId>@<publishAtISO>" ...');
    process.exit(2);
  }
  let failed = 0;
  for (const pair of pairs) {
    const separator = pair.lastIndexOf("@");
    const libraryId = pair.slice(0, separator);
    const publishAt = pair.slice(separator + 1);
    if (!libraryId || !Number.isFinite(Date.parse(publishAt))) {
      console.error(`bad argument (expected libraryId@publishAtISO): ${pair}`);
      failed += 1;
      continue;
    }
    try {
      await scheduleAutoYouTube(libraryId, publishAt, AUTO_CONTENT_CREATED_BY);
      console.log(`OK ${libraryId} -> ${publishAt}`);
    } catch (error) {
      failed += 1;
      console.error(`FAILED ${libraryId} -> ${publishAt}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

main();
