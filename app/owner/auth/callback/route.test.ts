import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ completeLogin: vi.fn(), signOut: vi.fn() }));

vi.mock("../../../../lib/platform/adapters/supabase/owner-auth", () => ({ supabaseOwnerAuth: auth }));

import { GET } from "./route";

describe("owner login callback redirects", () => {
  beforeEach(() => {
    vi.stubEnv("APP_URL", "http://192.168.18.13:3000");
    vi.stubEnv("OWNER_EMAIL", "owner@example.com");
    auth.completeLogin.mockResolvedValue({ id: "owner", email: "owner@example.com" });
    auth.signOut.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("keeps the owner on the configured origin instead of the internal server hostname", async () => {
    const response = await GET(new Request("http://localhost:3000/owner/auth/callback?code=test", {
      headers: { host: "untrusted.example", "x-forwarded-host": "untrusted.example" },
    }));

    expect(response.headers.get("location")).toBe("http://192.168.18.13:3000/owner/orders");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("keeps failed links on the configured origin", async () => {
    auth.completeLogin.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost:3000/owner/auth/callback?code=invalid"));

    expect(response.headers.get("location")).toBe("http://192.168.18.13:3000/owner/login?error=link");
  });

  it("still signs out a user who is not the configured owner", async () => {
    auth.completeLogin.mockResolvedValue({ id: "stranger", email: "stranger@example.com" });

    const response = await GET(new Request("http://localhost:3000/owner/auth/callback?code=test"));

    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe("http://192.168.18.13:3000/owner/login?error=link");
  });

  it("uses the request URL when no public origin or host header is configured", async () => {
    vi.stubEnv("APP_URL", "");

    const response = await GET(new Request("https://cakes.example/owner/auth/callback?code=test"));

    expect(response.headers.get("location")).toBe("https://cakes.example/owner/orders");
  });
});
