import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { proxy } from "./proxy";

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));

afterEach(() => vi.unstubAllEnvs());

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://cakes.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-placeholder");
});

describe("owner proxy", () => {
  it("redirects a visitor without the Supabase session cookie", async () => {
    vi.mocked(createServerClient).mockReturnValue({ auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: null })) } } as never);
    const response = await proxy(new NextRequest("https://cakes.invalid/owner/orders"));
    expect(response.headers.get("location")).toBe("https://cakes.invalid/owner/login");
  });

  it("lets login and callback requests through", async () => {
    const login = await proxy(new NextRequest("https://cakes.invalid/owner/login"));
    const callback = await proxy(new NextRequest("https://cakes.invalid/owner/auth/callback?code=example"));
    expect(login.headers.get("location")).toBeNull();
    expect(callback.headers.get("location")).toBeNull();
  });

  it("lets requests with the expected auth cookie through", async () => {
    vi.mocked(createServerClient).mockReturnValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { email: "owner@example.com" } }, error: null })) } } as never);
    const request = new NextRequest("https://cakes.invalid/owner/orders", { headers: { cookie: "sb-cakes-auth-token.0=part" } });
    expect((await proxy(request)).headers.get("location")).toBeNull();
  });
});
