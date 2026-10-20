import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { createTestDb } from "../db/test-db";
import { addons, dessertTypes, flavourGroups, flavours, frostings, sizeMultipliers } from "../db/schema";
import {
  CatalogueAdminError, addAddon, addDessertType, addFlavour, addFrosting, hideAddon, hideDessertType, hideFlavour, hideFrosting, hideSize,
  multiplierHundredths, renameAddon, renameDessertType, renameFlavour, renameFrosting, updateAddonPrice,
  updateDessertFlavourSuggestions, updateDessertTypePrice, updateFlavourGroupPrice, updateSizeMultiplier,
} from "./admin";
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

  it("adds, renames, reprices and hides items without deleting them", async () => {
    const { db } = await seeded();
    const flavour = await addFlavour(db, { name: "Orange Blossom", group: "classic" });
    await renameFlavour(db, flavour, "Orange Spice");
    expect((await db.select().from(flavours).where(eq(flavours.key, flavour)))[0]).toMatchObject({ name: "Orange Spice", active: true });
    await hideFlavour(db, flavour);
    expect((await db.select().from(flavours).where(eq(flavours.key, flavour)))[0].active).toBe(false);

    const frosting = await addFrosting(db, "Ganache");
    await renameFrosting(db, frosting, "Dark ganache");
    await hideFrosting(db, frosting);
    expect((await db.select().from(frostings).where(eq(frostings.key, frosting)))[0]).toMatchObject({ name: "Dark ganache", active: false });

    const addon = await addAddon(db, { name: "Gold leaf", price: "250" });
    await renameAddon(db, addon, "Silver leaf");
    await updateAddonPrice(db, addon, 300);
    await hideAddon(db, addon);
    expect((await db.select().from(addons).where(eq(addons.key, addon)))[0]).toMatchObject({ name: "Silver leaf", price: 300, active: false });

    const dessert = await addDessertType(db, { name: "Mini tarts", price: 40, flavourSuggestions: ["Lemon"] });
    await renameDessertType(db, dessert, "Mini lemon tarts");
    await updateDessertTypePrice(db, dessert, 45);
    await updateDessertFlavourSuggestions(db, dessert, ["Lemon", "Berry"]);
    await hideDessertType(db, dessert);
    expect((await db.select().from(dessertTypes).where(eq(dessertTypes.key, dessert)))[0]).toMatchObject({
      name: "Mini lemon tarts", price: 45, flavourSuggestions: ["Lemon", "Berry"], active: false,
    });
  });

  it("rejects duplicate names case-insensitively and hiding each last required choice", async () => {
    const { db } = await seeded();
    await expect(addFlavour(db, { name: "vAnIlLa", group: "classic" })).rejects.toMatchObject({ code: "DUPLICATE_NAME" });
    const flavour = (await db.select().from(flavours))[0];
    await hideFlavour(db, flavour.key);
    await expect(addFlavour(db, { name: "Vanilla", group: "classic" })).rejects.toMatchObject({ code: "DUPLICATE_NAME" });
    const lastFlavour = (await db.select().from(flavours))[1];
    await db.update(flavours).set({ active: false });
    await db.update(flavours).set({ active: true }).where(eq(flavours.key, lastFlavour.key));
    await expect(hideFlavour(db, lastFlavour.key)).rejects.toMatchObject({ code: "LAST_ACTIVE_ITEM" });

    const frostingKeys = (await db.select().from(frostings)).map(item => item.key);
    await hideFrosting(db, frostingKeys[0]);
    await hideFrosting(db, frostingKeys[1]);
    await expect(hideFrosting(db, frostingKeys[2])).rejects.toMatchObject({ code: "LAST_ACTIVE_ITEM" });
    const dessertKeys = (await db.select().from(dessertTypes)).map(item => item.key);
    for (const key of dessertKeys.slice(0, -1)) await hideDessertType(db, key);
    await expect(hideDessertType(db, dessertKeys.at(-1)!)).rejects.toMatchObject({ code: "LAST_ACTIVE_ITEM" });
    const sizes = (await db.select().from(sizeMultipliers)).map(item => item.size);
    for (const size of sizes.slice(0, -1)) await hideSize(db, size);
    await expect(hideSize(db, sizes.at(-1)!)).rejects.toMatchObject({ code: "LAST_ACTIVE_ITEM" });
  });
});
