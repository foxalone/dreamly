import { DreamImageError, readGalleryImage } from "@/lib/dreamImage";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const thumb = new URL(request.url).searchParams.get("thumb") === "1";
    const bytes = await readGalleryImage(id, thumb);
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": "image/webp" } });
  } catch (error) {
    return new Response(null, { status: error instanceof DreamImageError ? 404 : 503, headers });
  }
}
