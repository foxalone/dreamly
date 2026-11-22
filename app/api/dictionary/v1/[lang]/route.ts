import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { buildAndroidDictionary } from "@/lib/androidDictionary";
import { isLocale, type Locale } from "@/lib/i18n/config";

export const runtime = "nodejs";

const catalogs = new Map<Locale, { bytes: Uint8Array<ArrayBuffer>; etag: string }>();
const cacheControl = "public, max-age=0, s-maxage=300, no-transform";

export async function GET(request: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) return new Response(null, { status: 404 });

  let catalog = catalogs.get(lang);
  if (!catalog) {
    const bytes = Uint8Array.from(gzipSync(JSON.stringify(buildAndroidDictionary(lang)), { level: 9 }));
    const etag = `"${createHash("sha256").update(bytes).digest("hex")}"`;
    catalog = { bytes, etag };
    catalogs.set(lang, catalog);
  }
  const headers = {
    "Cache-Control": cacheControl,
    "Content-Type": "application/octet-stream",
    ETag: catalog.etag,
  };
  const validators = request.headers.get("If-None-Match")?.split(",").map((value) => value.trim().replace(/^W\//, ""));
  if (validators?.some((value) => value === "*" || value === catalog.etag)) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(catalog.bytes, { headers });
}
