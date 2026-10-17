import { eq } from "drizzle-orm";
import { afterAll, beforeAll, expect, it } from "vitest";
import { flavourGroups, flavours, settings } from "../db/schema";
import { createTestDb } from "../db/test-db";
import { getCatalogue } from "./catalogue";
import { seedCatalogue } from "./seed";

let database: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => {
  database = await createTestDb();
  await seedCatalogue(database.db);
});
afterAll(async () => { await database?.close(); });

it("returns a frozen, ordered catalogue with settings and null unset text", async () => {
  const catalogue = await getCatalogue(database.db);
  expect(catalogue.flavours).toHaveLength(19);
  expect(catalogue.flavours[0]).toEqual({ key: "vanilla", name: "Vanilla", group: "classic", diet: "standard", active: true });
  expect(catalogue.sizes.map(s => s.size)).toEqual([8, 10, 12, 14, 16]);
  expect(catalogue.settings.owner_alert_phone).toBeNull();
  expect(catalogue.settings.max_tiers).toBe(3);
  expect(Object.isFrozen(catalogue) && Object.isFrozen(catalogue.flavours) && Object.isFrozen(catalogue.flavours[0])).toBe(true);
  expect(Object.isFrozen(catalogue.dessertTypes[0].flavourSuggestions)).toBe(true);
});

it("hides inactive items from the orderable catalogue only", async () => {
  await database.db.update(flavours).set({ active: false }).where(eq(flavours.key, "banana_cinnamon"));
  await database.db.update(flavourGroups).set({ active: false }).where(eq(flavourGroups.key, "fruit"));
  const orderable = await getCatalogue(database.db);
  const full = await getCatalogue(database.db, { includeInactive: true });
  const keys = (c: typeof full) => c.flavours.map(f => f.key);
  expect(keys(orderable)).not.toContain("banana_cinnamon");
  expect(keys(orderable)).not.toContain("traditional_fruit_cake");
  expect(orderable.flavourGroups.map(g => g.key)).not.toContain("fruit");
  expect(full.flavours.find(f => f.key === "banana_cinnamon")).toMatchObject({ active: false });
  expect(full.flavours).toHaveLength(19);
});

it("reads edits on the next call instead of caching across requests", async () => {
  await database.db.update(flavourGroups).set({ basePrice: 1500 }).where(eq(flavourGroups.key, "classic"));
  await database.db.update(settings).set({ value: 4 }).where(eq(settings.key, "max_tiers"));
  const catalogue = await getCatalogue(database.db);
  expect(catalogue.flavourGroups.find(g => g.key === "classic")?.basePrice).toBe(1500);
  expect(catalogue.settings.max_tiers).toBe(4);
});
