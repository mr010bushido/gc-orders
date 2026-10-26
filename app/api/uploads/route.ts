import { getDb } from "../../../lib/db";
import { postUpload } from "../../../lib/images/http";
import { imageStore } from "../../../lib/platform/image-store-select";
import { rateLimiter } from "../../../lib/platform/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return postUpload(request, { db: getDb(), store: imageStore(), limiter: rateLimiter });
}
