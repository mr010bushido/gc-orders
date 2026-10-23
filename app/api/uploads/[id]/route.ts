import { getDb } from "../../../../lib/db";
import { removeUpload } from "../../../../lib/images/http";
import { supabaseImageStore } from "../../../../lib/platform/adapters/supabase/image-store";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return removeUpload(request, (await params).id, { db: getDb(), store: supabaseImageStore });
}
