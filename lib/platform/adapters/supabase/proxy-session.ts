import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

type CookieUpdate = { name: string; value: string; options: CookieOptions };
type ClientFactory = (request: NextRequest, setCookies: (cookies: CookieUpdate[], headers?: Record<string, string>) => void) => SupabaseClient;

function configuredClient(request: NextRequest, setCookies: (cookies: CookieUpdate[], headers?: Record<string, string>) => void): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Owner login is not configured");

  return createServerClient(url, key, {
    cookieOptions: {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
    cookies: {
      getAll: () => request.cookies.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (cookies, headers) => setCookies(cookies, headers),
    },
  });
}

export function createSupabaseProxySession(clientFactory: ClientFactory = configuredClient) {
  return async function refreshSupabaseSession(request: NextRequest): Promise<NextResponse> {
    const updates: CookieUpdate[] = [];
    const responseHeaders: Record<string, string> = {};
    let authenticated = false;
    try {
      const client = clientFactory(request, (cookies, headers) => {
        updates.push(...cookies);
        if (headers) Object.assign(responseHeaders, headers);
      });
      const { data, error } = await client.auth.getUser();
      authenticated = !error && Boolean(data.user?.email);
    } catch {
      authenticated = false;
    }

    const requestHeaders = new Headers(request.headers);
    const requestCookies = new Map(request.cookies.getAll().map(({ name, value }) => [name, value]));
    for (const { name, value, options } of updates) {
      if (options.maxAge === 0 || value === "") requestCookies.delete(name);
      else requestCookies.set(name, value);
    }
    if (updates.length) {
      requestHeaders.set("cookie", [...requestCookies].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("; "));
    }

    const response = authenticated
      ? NextResponse.next({ request: { headers: requestHeaders } })
      : NextResponse.redirect(new URL("/owner/login", request.url));
    for (const [name, value] of Object.entries(responseHeaders)) response.headers.set(name, value);
    for (const { name, value, options } of updates) response.cookies.set(name, value, options);
    return response;
  };
}

export const refreshSupabaseSession = createSupabaseProxySession();
