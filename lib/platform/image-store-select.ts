import { createLocalImageStore } from "./adapters/local/image-store";
import { supabaseImageStore } from "./adapters/supabase/image-store";
import type { ImageStore } from "./image-store";

export function imageStore(): ImageStore {
  if (process.env.IMAGE_STORE === "local") {
    if (process.env.NODE_ENV === "production") throw new Error("Local image storage is for development only");
    return createLocalImageStore();
  }
  if (process.env.IMAGE_STORE && process.env.IMAGE_STORE !== "supabase") throw new Error("Invalid IMAGE_STORE");
  return supabaseImageStore;
}
