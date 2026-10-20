import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { createTestDb } from "../db/test-db";
import { addons, dessertTypes, flavourGroups, sizeMultipliers } from "../db/schema";
import { CatalogueAdminError, multiplierHundredths, updateAddonPrice, updateDessertTypePrice, updateFlavourGroupPrice, updateSizeMultiplier } from "./admin";
import { seedCatalogue } from "./seed";

const databases: Awaited<ReturnType<typeof createTestDb>>[] = [];
afterEach(async () => {
  await Promise.all(databases.splice(0).map(database => database.close()));
});

async function seeded() {
  const database = await createTestDb();
  databases.push(database);
  await seedCatalogue(database.db);
  return database;
}

describe("catalogue price writes", () => {
  it("requires whole positive Kwacha and leaves the old value intact after invalid input", async () => {
    const { db } = await seeded();
    for (const invalid of [0, 12.5, "12.5", "0", "-1", Number.MAX_SAFE_INTEGER + 1]) {
      await expect(updateFlavourGroupPrice(db, "classic", invalid)).rejects.toMatchObject({
        field: "basePrice", code: "INVALID_PRICE",
      });
    }
    await expect(updateFlavourGroupPrice(db, "classic", "1350")).resolves.toBeUndefined();
    expect((await db.select().from(flavourGroups).where(eq(flavourGroups.key, "classic")))[0].basePrice).toBe(1350);
  });

  it("updates add-on and dessert prices and records updated_at", async () => {
    const { db } = await seeded();
    const before = (await db.select().from(addons).where(eq(addons.key, "edible_print")))[0].updatedAt;
    await updateAddonPrice(db, "edible_print", 125);
    await updateDessertTypePrice(db, "cupcakes", 35);
    expect((await db.select().from(addons).where(eq(addons.key, "edible_print")))[0]).toMatchObject({ price: 125 });
    expect((await db.select().from(addons).where(eq(addons.key, "edible_print")))[0].updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect((await db.select().from(dessertTypes).where(eq(dessertTypes.key, "cupcakes")))[0].price).toBe(35);
  });

  it("parses decimal multipliers exactly into integer hundredths", async () => {
    expect(multiplierHundredths("1.2")).toBe(120);
    expect(multiplierHundredths("0.10")).toBe(10);
    expect(multiplierHundredths("5.00")).toBe(500);
    for (const invalid of ["0.09", "5.01", "1.234", "1e2", "1.2x", 1.2, "0"]) {
      expect(() => multiplierHundredths(invalid)).toThrow(CatalogueAdminError);
    }
    const { db } = await seeded();
    await updateSizeMultiplier(db, 12, "1.2");
    expect((await db.select().from(sizeMultipliers).where(eq(sizeMultipliers.size, 12)))[0].multiplier).toBe(120);
  });
});
