import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { makeOwnerAuthFake } from "@/lib/platform/fakes";
import { createTestDb } from "@/lib/db/test-db";
import { settings } from "@/lib/db/schema";
import * as adapter from "@/lib/platform/adapters/supabase/owner-auth";
import { manageCatalogueItem, saveFeesAndRules, savePaymentAndContact, savePrices, saveTimeWindows } from "./actions";

const request = vi.hoisted(() => ({ headers: new Headers(), db: undefined as unknown, dbCalls: 0 }));
vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => { request.dbCalls++; return request.db; } }));
vi.mock("@/lib/platform/adapters/supabase/owner-auth", async () => {
  const { makeOwnerAuthFake } = await import("@/lib/platform/fakes");
  const fake = makeOwnerAuthFake();
  return { supabaseOwnerAuth: fake.auth, fake };
});

type Fake = ReturnType<typeof makeOwnerAuthFake>;
const fake = (adapter as unknown as { fake: Fake }).fake;
let test: Awaited<ReturnType<typeof createTestDb>>;

async function signInAs(email: string) {
  await fake.auth.sendMagicLink(email, "");
  const link = fake.issuedLinks.at(-1)!;
  await fake.auth.completeLogin(link);
  request.headers = new Headers({ authorization: `Bearer ${link.get("token")}` });
}

beforeEach(async () => {
  vi.stubEnv("OWNER_EMAIL", "owner@example.com");
  test = await createTestDb();
  request.db = test.db;
  request.dbCalls = 0;
  request.headers = new Headers();
});
afterEach(async () => {
  vi.unstubAllEnvs();
  request.db = undefined;
  await test.close();
});

it("requires the owner before every settings write and does not open the database when signed out", async () => {
  const input = { delivery_fee: "150", rush_rate_percent: "20", rush_window_hours: "48", dessert_min_quantity: "30", dessert_lead_days: "5", dessert_surcharge_percent: "20", max_tiers: "3", capacity_per_day: "10", payment_expiry_hours: "24" };
  const calls = [
    () => savePrices({ flavourGroupPrices: { classic: "1350" }, addonPrices: {}, dessertPrices: {}, sizeMultipliers: {} }),
    () => saveFeesAndRules(input),
    () => saveTimeWindows({ morning_start_hour: "08:00", morning_end_hour: "11:00", afternoon_start_hour: "12:00", afternoon_end_hour: "16:00", evening_start_hour: "17:00", evening_end_hour: "20:00" }),
    () => savePaymentAndContact({ airtel_number: "0977659782", mtn_number: "0966222440", pickup_map_url: "https://example.com", owner_alert_phone: "" }),
    () => manageCatalogueItem({ kind: "flavour", operation: "add", name: "Caramel", group: "classic" }),
  ];
  for (const call of calls) await expect(call()).rejects.toThrow("redirect:/owner/login");
  expect(request.dbCalls).toBe(0);
  expect(await test.db.select().from(settings)).toHaveLength(0);
});

it("returns field errors for invalid saves and persists valid settings only for the owner", async () => {
  await signInAs("owner@example.com");
  await expect(saveFeesAndRules({ delivery_fee: "150", rush_rate_percent: "20", rush_window_hours: "48", dessert_min_quantity: "30", dessert_lead_days: "5", dessert_surcharge_percent: "20", max_tiers: "9", capacity_per_day: "10", payment_expiry_hours: "24" }))
    .resolves.toMatchObject({ ok: false, errors: { max_tiers: { code: "OUT_OF_RANGE" } } });
  await expect(savePrices({ flavourGroupPrices: { classic: "1350.5" }, addonPrices: {}, dessertPrices: {}, sizeMultipliers: {} }))
    .resolves.toMatchObject({ ok: false, errors: { "flavourGroupPrices.classic": { code: "INVALID_PRICE" } } });
  await expect(saveFeesAndRules({ delivery_fee: "150", rush_rate_percent: "20", rush_window_hours: "48", dessert_min_quantity: "30", dessert_lead_days: "5", dessert_surcharge_percent: "20", max_tiers: "3", capacity_per_day: "10", payment_expiry_hours: "24" }))
    .resolves.toEqual({ ok: true });
  expect(request.dbCalls).toBe(3);
  expect(await test.db.select().from(settings)).toHaveLength(9);
});
