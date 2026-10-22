import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// NASA's texture is equirectangular. Raster tiles must be Web Mercator so
// lunar longitudes/latitudes align correctly on the globe, without stretching.
const root = path.resolve("public/moon");
const { data, info } = await sharp(path.join(root, "lroc-color-2k.jpg")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const size = 2048;
const projected = Buffer.alloc(size * size * info.channels);
for (let y = 0; y < size; y++) {
  const latitude = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 0.5) / size)));
  const sourceY = Math.max(0, Math.min(info.height - 1, (0.5 - latitude / Math.PI) * info.height - 0.5));
  const y0 = Math.floor(sourceY);
  const y1 = Math.min(info.height - 1, y0 + 1);
  const blend = sourceY - y0;
  for (let x = 0; x < size; x++) {
    const sourceX = Math.min(info.width - 1, Math.floor((x + 0.5) / size * info.width));
    for (let c = 0; c < info.channels; c++) {
      projected[(y * size + x) * info.channels + c] = Math.round(
        data[(y0 * info.width + sourceX) * info.channels + c] * (1 - blend) +
        data[(y1 * info.width + sourceX) * info.channels + c] * blend,
      );
    }
  }
}
let count = 0;
for (let z = 0; z <= 3; z++) {
  const dimension = 256 * 2 ** z;
  const level = await sharp(projected, { raw: { width: size, height: size, channels: info.channels } })
    .resize(dimension, dimension).raw().toBuffer();
  for (let x = 0; x < 2 ** z; x++) {
    const folder = path.join(root, "tiles", String(z), String(x));
    await fs.mkdir(folder, { recursive: true });
    for (let y = 0; y < 2 ** z; y++) {
      await sharp(level, { raw: { width: dimension, height: dimension, channels: info.channels } })
        .extract({ left: x * 256, top: y * 256, width: 256, height: 256 })
        .webp({ quality: 86 }).toFile(path.join(folder, `${y}.webp`));
      count++;
    }
  }
}
console.log(`Built ${count} lunar tiles (zoom 0–3).`);
