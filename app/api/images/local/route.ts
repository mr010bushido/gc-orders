import { createLocalImageStore } from "../../../../lib/platform/adapters/local/image-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (process.env.IMAGE_STORE !== "local" || process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }
  const bytes = await createLocalImageStore().readSignedUrl(request.url);
  return bytes
    ? new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } })
    : new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
}
