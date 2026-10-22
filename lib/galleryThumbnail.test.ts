import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { createGalleryThumbnailRenderer } from "./galleryThumbnail";

test("concurrent clients and widths share a download and get correctly sized WebPs", async () => {
  const input = await sharp({ create: { width: 1024, height: 1536, channels: 3, background: "#332255" } }).png().toBuffer();
  let downloads = 0;
  let release!: (value: Buffer) => void;
  const source = new Promise<Buffer>((resolve) => { release = resolve; });
  const render = createGalleryThumbnailRenderer(async () => { downloads++; return source; });
  const first = render("https://image.test/a.png", 320);
  const duplicate = render("https://image.test/a.png", 320);
  const larger = render("https://image.test/a.png", 640);
  assert.equal(downloads, 1);
  assert.equal(first, duplicate);
  release(input);
  const [small, large] = await Promise.all([first, larger]);
  assert.equal((await sharp(small).metadata()).format, "webp");
  assert.equal((await sharp(small).metadata()).width, 320);
  assert.equal((await sharp(large).metadata()).width, 640);
});

test("a failed source is retried, and a changed URL fetches its own source", async () => {
  const input = await sharp({ create: { width: 40, height: 60, channels: 3, background: "white" } }).png().toBuffer();
  const urls: string[] = [];
  const render = createGalleryThumbnailRenderer(async (url) => {
    urls.push(url);
    if (urls.length === 1) throw new Error("source unavailable");
    return input;
  });
  await assert.rejects(render("https://image.test/v1.png", 320), /source unavailable/);
  const output = await render("https://image.test/v1.png", 320);
  assert.equal((await sharp(output).metadata()).width, 40);
  await render("https://image.test/v2.png", 320);
  assert.deepEqual(urls, ["https://image.test/v1.png", "https://image.test/v1.png", "https://image.test/v2.png"]);
});
