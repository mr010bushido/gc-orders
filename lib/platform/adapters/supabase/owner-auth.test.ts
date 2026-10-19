import { describe, vi } from "vitest";
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
  const auth = createSupabaseOwnerAuth(() => client, async () => ({ set: vi.fn() }));
  return { auth, headers, issuedLinks };
}

describe("Supabase OwnerAuth adapter", () => {
  ownerAuthContract(factory);
});
