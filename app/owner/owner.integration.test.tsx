import { renderToStaticMarkup } from "react-dom/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { makeOwnerAuthFake } from "@/lib/platform/fakes";
import { createTestDb } from "@/lib/db/test-db";
import { orderStatusEvents, orders } from "@/lib/db/schema";
import { BOOKED_AT, orderInput } from "@/lib/orders/fixtures";
import { createOrder } from "@/lib/orders/orders";
import * as adapter from "@/lib/platform/adapters/supabase/owner-auth";
import { clearFlag, completeOrder, declineQuoteAction, flagOrder, markSeen, recordBalancePaid, sendQuoteAction, verifyOrder } from "./(console)/orders/actions";
import { signOutOwner } from "./actions";
import OwnerHome from "./page";
import OwnerLayout from "./(console)/layout";
import OwnerOrdersPage from "./(console)/orders/page";

type Fake = ReturnType<typeof makeOwnerAuthFake>;

// The real guard, adapter-free: requireOwner() runs against the in-memory OwnerAuth fake and a request header we control.
const request = vi.hoisted(() => ({ headers: new Headers(), db: undefined as unknown, testDb: undefined as unknown, after: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/server")>()), connection: async () => {}, after: request.after }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => request.db ?? ({}) }));
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
  request.db = undefined;
  request.testDb = undefined;
  request.after.mockClear();
});
afterEach(async () => {
  vi.unstubAllEnvs();
  const test = request.testDb as Awaited<ReturnType<typeof createTestDb>> | undefined;
  request.db = undefined;
  request.testDb = undefined;
  if (test && "close" in test) await test.close();
});

it("guards every exported order action before it can mutate the real test database", async () => {
  const test = await createTestDb();
  request.db = test.db;
  request.testDb = test;
  const { order } = await createOrder(test.db, orderInput(), BOOKED_AT);
  await test.db.update(orders).set({ status: "awaiting_verification" }).where(eq(orders.id, order.id));
  const beforeOrder = (await test.db.select().from(orders).where(eq(orders.id, order.id)))[0];
  const beforeEvents = await test.db.select().from(orderStatusEvents).where(eq(orderStatusEvents.orderId, order.id));
  const actions = [
    () => verifyOrder(order.id),
    () => flagOrder(order.id, "Review payment"),
    () => clearFlag(order.id),
    () => completeOrder(order.id),
    () => recordBalancePaid(order.id, "cash", "Received"),
    () => markSeen(order.id),
    () => sendQuoteAction(order.id, [{ label: "Cake", amount: 100 }]),
    () => declineQuoteAction(order.id),
  ];

  for (const authenticateAs of [null, "stranger@example.com"]) {
    request.headers = new Headers();
    if (authenticateAs) await signInAs(authenticateAs);
    for (const action of actions) expect(await redirectTarget(action)).toBe("/owner/login");
  }

  expect(await test.db.select().from(orders).where(eq(orders.id, order.id))).toEqual([beforeOrder]);
  expect(await test.db.select().from(orderStatusEvents).where(eq(orderStatusEvents.orderId, order.id))).toEqual(beforeEvents);
  expect(request.after).not.toHaveBeenCalled();
});

it("sends a quote after commit and never returns the access-token hash", async () => {
  const test = await createTestDb();
  request.db = test.db;
  request.testDb = test;
  await signInAs("owner@example.com");
  const { order } = await createOrder(test.db, orderInput({ requestsQuote: true, basket: { lines: [], total: 0, deposit: 0 } }), BOOKED_AT);
  const result = await sendQuoteAction(order.id, [{ label: "Custom cake", amount: 400 }]);
  expect(result).toMatchObject({ ok: true, order: { status: "awaiting_payment", total: 400, deposit: 200 } });
  expect(JSON.stringify(result)).not.toContain("accessTokenHash");
  expect(request.after).toHaveBeenCalledOnce();
  const callback = request.after.mock.calls[0][0] as () => Promise<void>;
  await callback();
  expect(request.after).toHaveReturned();
});

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
