import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Owner, OwnerAuth } from "../../owner-auth";

type CookieUpdate = { name: string; value: string; options: Record<string, unknown> };
type CookieStore = {
  set(name: string, value: string, options: Record<string, unknown>): void;
  getAll(): Array<{ name: string; value: string }>;
};
type CookieStoreFactory = () => Promise<CookieStore>;
type ClientFactory = (headers: Headers, setCookies?: (cookies: CookieUpdate[]) => void) => SupabaseClient;

function configuredClient(headers: Headers, setCookies?: Parameters<ClientFactory>[1]): SupabaseClient {
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
      getAll: () => (headers.get("cookie") ?? "").split(";").flatMap((part) => {
        const separator = part.indexOf("=");
        if (separator < 0) return [];
        return [{ name: part.slice(0, separator).trim(), value: decodeURIComponent(part.slice(separator + 1).trim()) }];
      }),
      setAll: (values) => setCookies?.(values),
    },
  });
}

export function createSupabaseOwnerAuth(
  clientFactory: ClientFactory = configuredClient,
  getCookieStore: CookieStoreFactory = async () => await cookies(),
): OwnerAuth {
  return {
    async sendMagicLink(email, redirectTo) {
      const client = clientFactory(new Headers());
      const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      if (error) throw error;
    },
    async completeLogin(params) {
      const cookieStore = await getCookieStore();
      const cookieHeader = params.get("cookie") ?? "";
      const client = clientFactory(new Headers({ cookie: cookieHeader }), (updates) => {
        for (const item of updates) cookieStore.set(item.name, item.value, item.options);
      });
      const tokenHash = params.get("token_hash");
      const code = params.get("code");
      const result = tokenHash
        ? await client.auth.verifyOtp({ token_hash: tokenHash, type: params.get("type") === "magiclink" ? "magiclink" : "email" })
        : code
          ? await client.auth.exchangeCodeForSession(code)
          : { data: { user: null }, error: new Error("Invalid login link") };
      if (result.error || !result.data.user?.email) return null;
      return { id: result.data.user.id, email: result.data.user.email };
    },
    async getOwner(headers: Headers): Promise<Owner | null> {
      const client = clientFactory(headers);
      const { data, error } = await client.auth.getUser();
      if (error || !data.user?.email) return null;
      return { id: data.user.id, email: data.user.email };
    },
    async signOut(headers: Headers) {
      const cookieStore = await getCookieStore();
      const requestHeaders = new Headers(headers);
      if (cookieStore.getAll().length) {
        requestHeaders.set("cookie", cookieStore.getAll().map(({ name, value }) => `${name}=${encodeURIComponent(value)}`).join("; "));
      }
      const client = clientFactory(requestHeaders, (updates) => {
        for (const item of updates) cookieStore.set(item.name, item.value, item.options);
      });
      await client.auth.signOut();
    },
  };
}

export const supabaseOwnerAuth = createSupabaseOwnerAuth();
