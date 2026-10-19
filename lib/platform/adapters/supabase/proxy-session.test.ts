import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseProxySession } from "./proxy-session";

const secureCookie = { path: "/", httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: 3600 };

describe("Supabase proxy session refresh", () => {
  it("propagates refreshed cookies to downstream rendering and the browser", async () => {
    let downstreamCookie = "";
    const refresh = createSupabaseProxySession((_request, setCookies) => ({
      auth: {
        getUser: async () => {
          setCookies([
            { name: "sb-session", value: "new-access", options: secureCookie },
            { name: "sb-refresh", value: "new-refresh", options: secureCookie },
          ], { "Cache-Control": "private, no-store", Expires: "0" });
          return { data: { user: { email: "owner@example.com" } }, error: null };
        },
      },
    }) as unknown as SupabaseClient);
    const response = await refresh(new NextRequest("https://cakes.invalid/owner/orders", {
      headers: { cookie: "theme=dark; sb-session=old-access" },
    }));
    downstreamCookie = response.headers.get("x-middleware-request-cookie") ?? "";
    const setCookies = response.headers.getSetCookie();

    expect(decodeURIComponent(downstreamCookie)).toContain("sb-session=new-access");
    expect(decodeURIComponent(downstreamCookie)).toContain("sb-refresh=new-refresh");
    expect(decodeURIComponent(downstreamCookie)).toContain("theme=dark");
    expect(setCookies).toHaveLength(2);
    expect(setCookies.every((cookie) => cookie.includes("HttpOnly") && cookie.includes("Secure") && cookie.includes("SameSite=lax"))).toBe(true);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("expires")).toBe("0");
  });

  it("keeps refresh cookie updates on the logged-out redirect", async () => {
    const refresh = createSupabaseProxySession((_request, setCookies) => ({
      auth: { getUser: async () => {
        setCookies([{ name: "sb-session", value: "", options: { ...secureCookie, maxAge: 0 } }]);
        return { data: { user: null }, error: null };
      } },
    }) as unknown as SupabaseClient);
    const response = await refresh(new NextRequest("https://cakes.invalid/owner/orders"));

    expect(response.headers.get("location")).toBe("https://cakes.invalid/owner/login");
    expect(response.headers.getSetCookie()).toEqual(expect.arrayContaining([expect.stringContaining("sb-session=;")]));
  });

  it("fails safely when authentication lookup errors", async () => {
    const refresh = createSupabaseProxySession(() => ({
      auth: { getUser: async () => ({ data: { user: null }, error: new Error("auth unavailable") }) },
    }) as unknown as SupabaseClient);
    const response = await refresh(new NextRequest("https://cakes.invalid/owner/orders"));
    expect(response.headers.get("location")).toBe("https://cakes.invalid/owner/login");
  });
});
