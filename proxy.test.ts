import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

afterEach(() => vi.unstubAllEnvs());

describe("owner proxy", () => {
  it("redirects a visitor without the Supabase session cookie", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://cakes.supabase.co");
    const response = proxy(new NextRequest("https://cakes.invalid/owner/orders"));
    expect(response.headers.get("location")).toBe("https://cakes.invalid/owner/login");
  });

  it("lets login and callback requests through", () => {
    const login = proxy(new NextRequest("https://cakes.invalid/owner/login"));
    const callback = proxy(new NextRequest("https://cakes.invalid/owner/auth/callback?code=example"));
    expect(login.headers.get("location")).toBeNull();
    expect(callback.headers.get("location")).toBeNull();
  });

  it("lets requests with the expected auth cookie through", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://cakes.supabase.co");
    const request = new NextRequest("https://cakes.invalid/owner/orders", { headers: { cookie: "sb-cakes-auth-token.0=part" } });
    expect(proxy(request).headers.get("location")).toBeNull();
  });
});
