import { unstable_noStore as noStore } from "next/cache";

/** Keep static articles available when optional remote metadata is unavailable. */
export async function optionalPageData<T>(
  label: string,
  read: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    // Never cache the degraded page for the article's week-long ISR interval.
    // The next request should retry the image, video or SEO override read.
    noStore();
    console.error(`[optionalPageData:${label}]`, error);
    return fallback;
  }
}
