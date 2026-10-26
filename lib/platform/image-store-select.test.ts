import { afterEach, expect, it, vi } from "vitest";
import { imageStore } from "./image-store-select";
import { supabaseImageStore } from "./adapters/supabase/image-store";

afterEach(() => vi.unstubAllEnvs());

it("selects local only when configured and outside production", () => {
  vi.stubEnv("IMAGE_STORE", "local");
  expect(imageStore()).toHaveProperty("readSignedUrl");
  vi.stubEnv("NODE_ENV", "production");
  expect(() => imageStore()).toThrow("development only");
  vi.stubEnv("IMAGE_STORE", "supabase");
  expect(imageStore()).toBe(supabaseImageStore);
  vi.stubEnv("IMAGE_STORE", "unknown");
  expect(() => imageStore()).toThrow("Invalid IMAGE_STORE");
});
