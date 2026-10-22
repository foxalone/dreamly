// Run after the new deployment is ready. With --all, prepare the entire gallery.
// Only public pages and their own thumbnail URLs are requested; no credentials.
const args = process.argv.slice(2);
const origin = new URL(args.find((arg) => !arg.startsWith("--")) || "http://127.0.0.1:3001").origin;
const response = await fetch(`${origin}/gallery`, { signal: AbortSignal.timeout(60_000) });
if (!response.ok) throw new Error(`Gallery returned ${response.status}`);
const html = await response.text();
const thumbnails = [...new Set([...html.matchAll(/\/api\/gallery\/thumb\?[^\s"'<> ,]+/g)]
  .map(([url]) => url.replaceAll("&amp;", "&")))];
const slugs = new Set();
const urls = thumbnails.filter((path) => {
  const url = new URL(path, origin);
  const slug = url.searchParams.get("slug");
  if (!slug || !url.searchParams.has("v")) return false;
  if (!args.includes("--all") && !slugs.has(slug) && slugs.size >= 12) return false;
  slugs.add(slug);
  return true;
});
if (!urls.length) throw new Error("No thumbnail URLs found in the gallery HTML");
let next = 0;
let failed = 0;
let bytes = 0;
const started = performance.now();
await Promise.all(Array.from({ length: Math.min(4, urls.length) }, async () => {
  while (next < urls.length) {
    const path = urls[next++];
    try {
      const result = await fetch(new URL(path, origin), { redirect: "error", signal: AbortSignal.timeout(60_000) });
      if (!result.ok || !result.headers.get("content-type")?.startsWith("image/webp")) {
        throw new Error(`HTTP ${result.status}; expected WebP`);
      }
      bytes += (await result.arrayBuffer()).byteLength;
    } catch (error) {
      failed++;
      console.error(`Failed ${path}: ${error.message}`);
    }
  }
}));
console.log(JSON.stringify({ origin, images: slugs.size, thumbnails: urls.length, failed, bytes, seconds: Number(((performance.now() - started) / 1000).toFixed(2)) }));
if (failed) process.exitCode = 1;
