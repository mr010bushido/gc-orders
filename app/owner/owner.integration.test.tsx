import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { makeOwnerAuthFake } from "@/lib/platform/fakes";
import * as adapter from "@/lib/platform/adapters/supabase/owner-auth";
import { signOutOwner } from "./actions";
import OwnerHome from "./page";
import OwnerLayout from "./(console)/layout";
import OwnerOrdersPage from "./(console)/orders/page";

type Fake = ReturnType<typeof makeOwnerAuthFake>;

// The real guard, adapter-free: requireOwner() runs against the in-memory OwnerAuth fake and a request header we control.
const request = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/server")>()), connection: async () => {} }));
vi.mock("@/lib/db", () => ({ getDb: () => ({}) }));
vi.mock("@/lib/owner/orders-query", () => ({ listOwnerOrders: async () => ({ orders: [], nextCursor: null }), getOwnerOrderDetail: async () => null }));
vi.mock("@/components/ThemeToggle", () => ({ ThemeToggle: () => null }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/owner/orders",
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/platform/adapters/supabase/owner-auth", async () => {
  const { makeOwnerAuthFake } = await import("@/lib/platform/fakes");
  const fake = makeOwnerAuthFake();
  return { supabaseOwnerAuth: fake.auth, fake };
});

const fake = (adapter as unknown as { fake: Fake }).fake;

async function signInAs(email: string) {
  await fake.auth.sendMagicLink(email, "");
  const link = fake.issuedLinks.at(-1)!;
  await fake.auth.completeLogin(link);
  request.headers = new Headers({ authorization: `Bearer ${link.get("token")}` });
}

async function redirectTarget(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? "";
    return digest.startsWith("NEXT_REDIRECT") ? digest.split(";")[2] : (() => { throw error; })();
  }
}

beforeEach(() => {
  vi.stubEnv("OWNER_EMAIL", "Owner@Example.com");
  request.headers = new Headers();
});
afterEach(() => vi.unstubAllEnvs());

it("redirects logged-out visitors from the shell and every page to the login page", async () => {
  expect(await redirectTarget(() => OwnerLayout({ children: null }))).toBe("/owner/login");
  expect(await redirectTarget(() => OwnerOrdersPage())).toBe("/owner/login");
  expect(await redirectTarget(() => OwnerHome())).toBe("/owner/login");
  expect(await redirectTarget(() => signOutOwner())).toBe("/owner/login");
});

it("renders the shell and empty orders list for the owner, and /owner goes to orders", async () => {
  await signInAs("owner@example.com");
  const shell = renderToStaticMarkup(await OwnerLayout({ children: await OwnerOrdersPage() }));
  expect(shell).toContain("Sign out");
  expect(shell).toContain('aria-current="page"');
  expect(shell).toContain("No orders match these filters.");
  expect(shell).not.toContain("font-display");
  expect(await redirectTarget(() => OwnerHome())).toBe("/owner/orders");
});

it("refuses a signed-in user who is not the owner", async () => {
  await signInAs("stranger@example.com");
  expect(await redirectTarget(() => OwnerLayout({ children: null }))).toBe("/owner/login");
  expect(await redirectTarget(() => OwnerOrdersPage())).toBe("/owner/login");
});

it("refuses everyone when OWNER_EMAIL is not set", async () => {
  vi.stubEnv("OWNER_EMAIL", "");
  await signInAs("owner@example.com");
  expect(await redirectTarget(() => OwnerOrdersPage())).toBe("/owner/login");
});

it("ends the session on sign out", async () => {
  await signInAs("owner@example.com");
  expect(await redirectTarget(() => signOutOwner())).toBe("/owner/login");
  expect(await redirectTarget(() => OwnerOrdersPage())).toBe("/owner/login");
});
