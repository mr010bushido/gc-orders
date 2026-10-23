import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ImageStore } from "../../image-store";

function configuredClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Image storage is not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function createSupabaseImageStore(client: () => SupabaseClient = configuredClient,
  bucket = process.env.SUPABASE_IMAGES_BUCKET ?? "cake-images"): ImageStore {
  return {
    async put(key, bytes, contentType) {
      const { error } = await client().storage.from(bucket).upload(key, bytes, { contentType, upsert: false });
      if (error) throw error;
    },
    async createSignedUrl(key, ttlSeconds) {
      const { data, error } = await client().storage.from(bucket).createSignedUrl(key, ttlSeconds);
      if (error || !data?.signedUrl) throw error ?? new Error("Could not sign image URL");
      return data.signedUrl;
    },
    async delete(key) {
      const { error } = await client().storage.from(bucket).remove([key]);
      if (error) throw error;
    },
  };
}

export const supabaseImageStore = createSupabaseImageStore();
