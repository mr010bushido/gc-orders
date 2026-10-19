import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ownerAuthContract } from "../../contracts";
import type { Owner } from "../../owner-auth";
import { createSupabaseOwnerAuth } from "./owner-auth";

function factory() {
  let current: Owner | null = null;
  const issuedLinks: URLSearchParams[] = [];
  const headers = new Headers();
  const client = {
    auth: {
      signInWithOtp: vi.fn(async ({ email }: { email: string }) => {
        const token = crypto.randomUUID();
        current = { id: email, email };
        issuedLinks.push(new URLSearchParams({ token_hash: token, type: "magiclink" }));
        return { data: {}, error: null };
      }),
      verifyOtp: vi.fn(async () => ({ data: { user: current }, error: null })),
      exchangeCodeForSession: vi.fn(async () => ({ data: { user: current }, error: null })),
      getUser: vi.fn(async () => ({ data: { user: headers.get("authorization") ? current : null }, error: null })),
      signOut: vi.fn(async () => { current = null; return { error: null }; }),
    },
  } as unknown as SupabaseClient;
  const auth = createSupabaseOwnerAuth(() => client, async () => ({ set: vi.fn(), getAll: () => [] }));
  return { auth, headers, issuedLinks };
}

describe("Supabase OwnerAuth adapter", () => {
  ownerAuthContract(factory);
});

describe("Supabase OwnerAuth adapter cookies", () => {
  it("stores the PKCE verifier cookies written while sending the link", async () => {
    const cookieStore = { set: vi.fn(), getAll: () => [] };
    const client = {
      auth: { signInWithOtp: vi.fn(async () => ({ data: {}, error: null })) },
    } as unknown as SupabaseClient;
    const auth = createSupabaseOwnerAuth((_headers, setCookies) => {
      client.auth.signInWithOtp = vi.fn(async () => {
        setCookies?.([{ name: "verifier-cookie", value: "pkce", options: { httpOnly: true } }]);
        return { data: {}, error: null };
      }) as never;
      return client;
    }, async () => cookieStore);
    await auth.sendMagicLink("owner@example.com", "https://cakes.invalid/owner/auth/callback");
    expect(cookieStore.set).toHaveBeenCalledWith("verifier-cookie", "pkce", { httpOnly: true });
  });

  it("treats a malformed cookie as signed out instead of throwing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://cakes.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-placeholder");
    const auth = createSupabaseOwnerAuth(undefined, async () => ({ set: vi.fn(), getAll: () => [] }));
    await expect(auth.getOwner(new Headers({ cookie: "sb-cakes-auth-token=%E0%A4%A" }))).resolves.toBeNull();
    vi.unstubAllEnvs();
  });
});
