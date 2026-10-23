import { getDb } from "../../../lib/db";
import { postUpload } from "../../../lib/images/http";
import { supabaseImageStore } from "../../../lib/platform/adapters/supabase/image-store";
import { rateLimiter } from "../../../lib/platform/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return postUpload(request, { db: getDb(), store: supabaseImageStore, limiter: rateLimiter });
}
