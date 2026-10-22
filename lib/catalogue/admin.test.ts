import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { createTestDb } from "../db/test-db";
import { addons, dessertTypes, flavourGroups, flavours, frostings, settings, sizeMultipliers } from "../db/schema";
import {
  CatalogueAdminError, addAddon, addDessertType, addFlavour, addFrosting, hideAddon, hideDessertType, hideFlavour, hideFrosting, hideSize,
  multiplierHundredths, renameAddon, renameDessertType, renameFlavour, renameFrosting, translateUniqueNameViolation, updateAddonPrice,
  showAddon, showDessertType, showFlavour, showFrosting, showSize,
  savePaymentSettings, savePricesSection, saveRulesSettings, saveTimeWindowSettings, updateDessertFlavourSuggestions,
  updateDessertTypePrice, updateFlavourGroupPrice, updateSizeMultiplier,
} from "./admin";
import { resolveSettings } from "./settings";
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

  it("saves the full seeded price form when an included add-on remains K0", async () => {
    const { db } = await seeded();
    const [group, ...otherGroups] = await db.select().from(flavourGroups);
    const input = {
      flavourGroupPrices: Object.fromEntries([group, ...otherGroups].map(item => [item.key, String(item.basePrice)])),
      addonPrices: Object.fromEntries((await db.select().from(addons)).map(item => [item.key, String(item.price)])),
      dessertPrices: Object.fromEntries((await db.select().from(dessertTypes)).map(item => [item.key, String(item.price)])),
      sizeMultipliers: Object.fromEntries((await db.select().from(sizeMultipliers)).map(item => [String(item.size), (item.multiplier / 100).toFixed(2)])),
    };
    input.flavourGroupPrices[group.key] = String(group.basePrice + 1);

    await expect(savePricesSection(db, input)).resolves.toBeUndefined();
    expect((await db.select().from(flavourGroups).where(eq(flavourGroups.key, group.key)))[0].basePrice).toBe(group.basePrice + 1);
    expect((await db.select().from(addons).where(eq(addons.key, "chocolate_drip")))[0].price).toBe(0);
  });

  it("rejects negative and fractional add-on prices when updating or adding", async () => {
    const { db } = await seeded();
    for (const invalid of [-1, 1.5, "-1", "1.5", "1e2", "0x10", " 5", "00"]) {
      await expect(updateAddonPrice(db, "chocolate_drip", invalid)).rejects.toMatchObject({
        field: "price", code: "INVALID_PRICE", message: "Enter a whole Kwacha amount of at least K0.",
      });
      await expect(addAddon(db, { name: `Invalid ${invalid}`, price: invalid })).rejects.toMatchObject({
        field: "price", code: "INVALID_PRICE",
      });
    }
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

  it("shows hidden flavours, frostings, add-ons, desserts and sizes", async () => {
    const { db } = await seeded();
    const flavour = (await db.select().from(flavours))[0];
    const frosting = (await db.select().from(frostings))[0];
    const addon = (await db.select().from(addons))[0];
    const dessert = (await db.select().from(dessertTypes))[0];
    const size = (await db.select().from(sizeMultipliers))[0];
    await hideFlavour(db, flavour.key);
    await hideFrosting(db, frosting.key);
    await hideAddon(db, addon.key);
    await hideDessertType(db, dessert.key);
    await hideSize(db, size.size);

    await showFlavour(db, flavour.key);
    await showFrosting(db, frosting.key);
    await showAddon(db, addon.key);
    await showDessertType(db, dessert.key);
    await showSize(db, size.size);

    expect((await db.select().from(flavours).where(eq(flavours.key, flavour.key)))[0].active).toBe(true);
    expect((await db.select().from(frostings).where(eq(frostings.key, frosting.key)))[0].active).toBe(true);
    expect((await db.select().from(addons).where(eq(addons.key, addon.key)))[0].active).toBe(true);
    expect((await db.select().from(dessertTypes).where(eq(dessertTypes.key, dessert.key)))[0].active).toBe(true);
    expect((await db.select().from(sizeMultipliers).where(eq(sizeMultipliers.size, size.size)))[0].active).toBe(true);
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

  it("maps the test database's case-insensitive name index violation to DUPLICATE_NAME", async () => {
    const { db } = await seeded();
    const [group] = await db.select({ id: flavourGroups.id }).from(flavourGroups).where(eq(flavourGroups.key, "classic"));
    let violation: unknown;
    try {
      await db.insert(flavours).values({ key: "vanilla_variant", name: "vAnIlLa", groupId: group.id, diet: "standard" });
    } catch (error) {
      violation = error;
    }
    expect(violation).toBeTruthy();
    await expect(translateUniqueNameViolation(() => Promise.reject(violation))).rejects.toMatchObject({
      field: "name", code: "DUPLICATE_NAME", message: "A catalogue item already has this name.",
    });
  });

  it("saves rule settings together using registry bounds and preserves values after an invalid save", async () => {
    const { db } = await seeded();
    const values = {
      delivery_fee: "200", rush_rate_percent: "15", rush_window_hours: "36", dessert_min_quantity: "24",
      dessert_lead_days: "3", dessert_surcharge_percent: "12", max_tiers: "4", capacity_per_day: "15", payment_expiry_hours: "18",
    };
    await expect(saveRulesSettings(db, { ...values, max_tiers: "9" })).rejects.toMatchObject({ field: "max_tiers", code: "OUT_OF_RANGE" });
    await saveRulesSettings(db, values);
    expect(resolveSettings(await db.select({ key: settings.key, value: settings.value }).from(settings))).toMatchObject({
      delivery_fee: 200, rush_rate_percent: 15, rush_window_hours: 36, dessert_min_quantity: 24,
      dessert_lead_days: 3, dessert_surcharge_percent: 12, max_tiers: 4, capacity_per_day: 15, payment_expiry_hours: 18,
    });
  });

  it("validates all ordered time windows before atomically saving HH:MM values", async () => {
    const { db } = await seeded();
    const valid = {
      morning_start_hour: "08:00", morning_end_hour: "11:30",
      afternoon_start_hour: "12:00", afternoon_end_hour: "16:30",
      evening_start_hour: "17:00", evening_end_hour: "20:00",
    };
    await expect(saveTimeWindowSettings(db, { ...valid, afternoon_start_hour: "11:00" })).rejects.toMatchObject({
      field: "afternoon_start_hour", code: "WINDOWS_OVERLAP",
    });
    expect(resolveSettings(await db.select({ key: settings.key, value: settings.value }).from(settings)).morning_start_hour).toBeNull();
    await expect(saveTimeWindowSettings(db, { ...valid, evening_end_hour: "16:00" })).rejects.toMatchObject({
      field: "evening_end_hour", code: "WINDOW_ORDER",
    });
    await saveTimeWindowSettings(db, valid);
    expect(resolveSettings(await db.select({ key: settings.key, value: settings.value }).from(settings))).toMatchObject(valid);
  });

  it("normalises payment and alert phones and accepts only HTTPS pickup links", async () => {
    const { db } = await seeded();
    const payment = {
      airtel_number: "0977 659 782", mtn_number: "0966 222 440",
      pickup_map_url: "https://example.com/pickup", owner_alert_phone: "0977 123 456",
    };
    await expect(savePaymentSettings(db, { ...payment, pickup_map_url: "http://example.com" })).rejects.toMatchObject({
      field: "pickup_map_url", code: "INVALID_URL",
    });
    await expect(savePaymentSettings(db, { ...payment, mtn_number: "123" })).rejects.toMatchObject({
      field: "mtn_number", code: "INVALID_PHONE",
    });
    await savePaymentSettings(db, payment);
    expect(resolveSettings(await db.select({ key: settings.key, value: settings.value }).from(settings))).toMatchObject({
      airtel_number: "+260977659782", mtn_number: "+260966222440", owner_alert_phone: "+260977123456",
      pickup_map_url: "https://example.com/pickup",
    });
  });

  it("rolls back the whole Prices and Sizes section if any referenced item is missing", async () => {
    const { db } = await seeded();
    await expect(savePricesSection(db, {
      flavourGroupPrices: { classic: "1350" }, addonPrices: { stale_key: "120" }, dessertPrices: {}, sizeMultipliers: {},
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await db.select().from(flavourGroups).where(eq(flavourGroups.key, "classic")))[0].basePrice).toBe(1300);
  });
});
