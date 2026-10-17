import { afterAll, beforeAll, expect, it } from "vitest";
import { addons, dessertTypes, flavourGroups, flavours, frostings, settings, sizeMultipliers } from "./schema";
import { createTestDb } from "./test-db";

let database: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => { database = await createTestDb(); });
afterAll(async () => { await database?.close(); });

it("stores every catalogue table with generated UUIDs and orderable defaults", async () => {
  const [group] = await database.db.insert(flavourGroups).values({ key: "classic", name: "Classic", basePrice: 1300 }).returning();
  const [flavour] = await database.db.insert(flavours).values({ key: "vanilla", name: "Vanilla", groupId: group.id }).returning();
  const [frosting] = await database.db.insert(frostings).values({ key: "buttercream", name: "Buttercream" }).returning();
  const [size] = await database.db.insert(sizeMultipliers).values({ size: 10, multiplier: 100 }).returning();
  const [addon] = await database.db.insert(addons).values({ key: "edible_print", name: "Edible print", price: 100 }).returning();
  const [dessert] = await database.db.insert(dessertTypes).values({ key: "cupcakes", name: "Cupcakes", price: 30 }).returning();
  for (const item of [group, flavour, frosting, size, addon, dessert]) {
    expect(item).toMatchObject({ id: expect.stringMatching(/^[0-9a-f-]{36}$/), active: true, sortOrder: 0 });
  }
  expect(flavour).toMatchObject({ groupId: group.id, diet: "standard" });
  expect(dessert.flavourSuggestions).toEqual([]);
  const [setting] = await database.db.insert(settings).values({ key: "owner_alert_phone", value: null }).returning();
  expect(setting).toMatchObject({ id: expect.any(String), value: null, updatedAt: expect.any(Date) });
});

it("rejects invalid diets, missing groups, duplicate keys, nonpositive prices or sizes and negative add-on prices", async () => {
  await database.db.insert(flavourGroups).values({ key: "constraints", name: "Constraints", basePrice: 1300 });
  await expect(database.client.exec("insert into flavours (key, name, group_id, diet) select 'invalid', 'Invalid', id, 'invalid' from flavour_groups where key = 'constraints'")).rejects.toThrow();
  await expect(database.db.insert(flavours).values({ key: "missing", name: "Missing", groupId: "00000000-0000-0000-0000-000000000000" })).rejects.toThrow();
  await expect(database.db.insert(flavourGroups).values({ key: "constraints", name: "Duplicate", basePrice: 1300 })).rejects.toThrow();
  await expect(database.db.insert(flavourGroups).values({ key: "invalid", name: "Invalid", basePrice: 0 })).rejects.toThrow();
  await expect(database.db.insert(addons).values({ key: "invalid", name: "Invalid", price: -1 })).rejects.toThrow();
  await expect(database.db.insert(addons).values({ key: "free", name: "Free", price: 0 })).resolves.toBeDefined();
  await expect(database.db.insert(dessertTypes).values({ key: "invalid", name: "Invalid", price: 0 })).rejects.toThrow();
  await expect(database.db.insert(sizeMultipliers).values({ size: 0, multiplier: 100 })).rejects.toThrow();
  await expect(database.db.insert(sizeMultipliers).values({ size: 12, multiplier: 0 })).rejects.toThrow();
});
