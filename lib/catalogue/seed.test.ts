import { eq } from "drizzle-orm";
import { afterAll, beforeAll, expect, it } from "vitest";
import { addons, dessertTypes, flavourGroups, flavours, frostings, settings, sizeMultipliers } from "../db/schema";
import { createTestDb } from "../db/test-db";
import { seedCatalogue } from "./seed";
import { SETTINGS } from "./settings";

let database: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => { database = await createTestDb(); });
afterAll(async () => { await database?.close(); });

async function counts() {
  const { db } = database;
  const all = await db.select().from(flavours);
  return {
    standard: all.filter(f => f.diet === "standard").length,
    specialDiet: all.filter(f => f.diet !== "standard").length,
    groups: (await db.select().from(flavourGroups)).length,
    frostings: (await db.select().from(frostings)).length,
    sizes: (await db.select().from(sizeMultipliers)).length,
    addons: (await db.select().from(addons)).length,
    desserts: (await db.select().from(dessertTypes)).length,
    settings: (await db.select().from(settings)).length,
  };
}

const expected = { standard: 13, specialDiet: 6, groups: 4, frostings: 3, sizes: 5, addons: 4, desserts: 11, settings: Object.keys(SETTINGS).length };

it("seeds the PRD catalogue and every setting default on a fresh database", async () => {
  await seedCatalogue(database.db);
  expect(await counts()).toEqual(expected);
  const groups = await database.db.select().from(flavourGroups);
  expect(Object.fromEntries(groups.map(g => [g.key, g.basePrice]))).toEqual({ classic: 1300, signature: 1400, fruit: 2000, vegan_diabetic: 1700 });
  const sizes = await database.db.select().from(sizeMultipliers);
  expect(Object.fromEntries(sizes.map(s => [s.size, s.multiplier]))).toEqual({ 8: 80, 10: 100, 12: 120, 14: 144, 16: 173 });
  const [phone] = await database.db.select().from(settings).where(eq(settings.key, "owner_alert_phone"));
  expect(phone.value).toBeNull();
  const [tiers] = await database.db.select().from(settings).where(eq(settings.key, "max_tiers"));
  expect(tiers.value).toBe(3);
});

it("never overwrites or duplicates rows when run again", async () => {
  await database.db.update(flavourGroups).set({ basePrice: 1350 }).where(eq(flavourGroups.key, "classic"));
  await database.db.update(settings).set({ value: 4 }).where(eq(settings.key, "max_tiers"));
  await seedCatalogue(database.db);
  expect(await counts()).toEqual(expected);
  const [classic] = await database.db.select().from(flavourGroups).where(eq(flavourGroups.key, "classic"));
  expect(classic.basePrice).toBe(1350);
  const [tiers] = await database.db.select().from(settings).where(eq(settings.key, "max_tiers"));
  expect(tiers.value).toBe(4);
});
