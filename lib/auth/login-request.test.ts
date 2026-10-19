import { describe, expect, it, vi } from "vitest";
import type { OwnerAuth } from "../platform/owner-auth";
import type { RateLimiter } from "../platform/rate-limit";
import { loginOrigin, requestOwnerLogin } from "./login-request";

function setup(allowed = true) {
  const auth: OwnerAuth = {
    sendMagicLink: vi.fn(async () => {}),
    completeLogin: vi.fn(async () => null),
    getOwner: vi.fn(async () => null),
    signOut: vi.fn(async () => {}),
  };
  const limiter: RateLimiter = { hit: vi.fn(async () => allowed) };
  return { auth, limiter };
}
const config = { ownerEmail: "owner@example.com", supabaseUrl: "https://example.invalid", supabaseAnonKey: "public", };

describe("requestOwnerLogin", () => {
  it("sends only to the configured owner and uses the same result", async () => {
    const owner = setup();
    const stranger = setup();
    const headers = new Headers({ "x-forwarded-for": "attacker, proxy" });
    await expect(requestOwnerLogin("OWNER@example.com", headers, "https://cakes.invalid", { ...config, ...owner })).resolves.toBe("sent");
    await expect(requestOwnerLogin("stranger@example.com", headers, "https://cakes.invalid", { ...config, ...stranger })).resolves.toBe("sent");
    expect(owner.auth.sendMagicLink).toHaveBeenCalledTimes(1);
    expect(stranger.auth.sendMagicLink).not.toHaveBeenCalled();
    expect(owner.limiter.hit).toHaveBeenCalledWith("owner-login:address:proxy", 5, 3600);
    expect(owner.limiter.hit).toHaveBeenCalledWith("owner-login:email:owner@example.com", 5, 3600);
  });

  it("sends nothing when either shared bucket is exhausted", async () => {
    const blocked = setup(false);
    await expect(requestOwnerLogin("owner@example.com", new Headers(), "https://cakes.invalid", { ...config, ...blocked })).resolves.toBe("rate-limited");
    expect(blocked.auth.sendMagicLink).not.toHaveBeenCalled();
    expect(blocked.limiter.hit).toHaveBeenCalledTimes(2);
  });

  it("degrades without Supabase configuration", async () => {
    const unconfigured = setup();
    await expect(requestOwnerLogin("owner@example.com", new Headers(), "https://cakes.invalid", { auth: unconfigured.auth, limiter: unconfigured.limiter, ownerEmail: "owner@example.com" })).resolves.toBe("not-configured");
    expect(unconfigured.auth.sendMagicLink).not.toHaveBeenCalled();
  });
});

describe("loginOrigin", () => {
  it("prefers APP_URL over a forged host header", () => {
    expect(loginOrigin(new Headers({ host: "attacker.invalid" }), "https://orders.cakes.invalid/")).toBe("https://orders.cakes.invalid");
  });

  it("falls back to the request host when APP_URL is unset", () => {
    expect(loginOrigin(new Headers({ host: "localhost:3100", "x-forwarded-proto": "http" }), "")).toBe("http://localhost:3100");
    expect(loginOrigin(new Headers(), "")).toBeNull();
  });
});
