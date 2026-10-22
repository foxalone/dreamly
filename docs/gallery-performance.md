# Gallery thumbnail performance

The gallery serves 320/480/640px WebPs instead of the original portrait PNGs.
Previously a thumbnail CDN/browser cache miss performed a Firestore read,
downloaded the original and ran Sharp again for every request.

`lib/galleryThumbnail.ts` now keeps the verified slug/version lookup and the
generated small WebP in Next's Data Cache for one year. The source image URL and
width form the WebP cache key, so replacing an image gets a separate derivative.
Only verified version lookups are cached: missing images, lookup failures and
stale/unknown versions are not pinned. Concurrent requests also share in-flight
downloads and conversions. Existing HTTP cache headers and original-image error
fallback remain in place. The first four gallery images are explicitly preloaded
with the same responsive source set used by the image elements.

Cold generation still needs to download and convert the source. After a new
deployment is ready, prepare thumbnails ahead of visitors:

```sh
# The first 12 images, at all responsive sizes (local preview by default):
node scripts/warm-gallery-thumbnails.mjs

# All gallery images on the deployed site:
node scripts/warm-gallery-thumbnails.mjs https://dreamly.art --all
```

The script sends four public requests at a time and reports failures. The Data
Cache must be enabled/persistent on the hosting platform for cross-instance reuse;
HTTP CDN caching also continues to apply. This cache does not remove cold page
rendering/Firestore latency or Next development compilation time.

Local check on 2026-10-22: `mud`, 320px, 31,596 bytes, same source version:
before 2.475s; first cached generation 2.948s; warm cache 0.007s. This measures one
thumbnail endpoint, not the whole gallery or production network performance.
