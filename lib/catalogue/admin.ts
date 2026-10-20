import { eq, sql } from "drizzle-orm";
import type { Db } from "../db";
import { addons, dessertTypes, flavourGroups, flavours, frostings, sizeMultipliers } from "../db/schema";

export class CatalogueAdminError extends Error {
  constructor(readonly field: string, readonly code: string, message: string) {
    super(message);
    this.name = "CatalogueAdminError";
  }
}

function priceValue(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 1) return value;
  if (typeof value === "string" && /^[1-9]\d*$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  throw new CatalogueAdminError(field, "INVALID_PRICE", "Enter a whole Kwacha amount of at least K1.");
}

export function multiplierHundredths(value: unknown, field = "multiplier"): number {
  if (typeof value !== "string" || !/^(?:0|[1-4])(?:\.\d{1,2})?$|^5(?:\.0{1,2})?$/.test(value)) {
    throw new CatalogueAdminError(field, "INVALID_MULTIPLIER", "Enter a multiplier from 0.10 to 5.00.");
  }
  const [whole, fraction = ""] = value.split(".");
  const hundredths = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (hundredths < 10 || hundredths > 500) {
    throw new CatalogueAdminError(field, "INVALID_MULTIPLIER", "Enter a multiplier from 0.10 to 5.00.");
  }
  return hundredths;
}

export async function updateFlavourGroupPrice(db: Db, key: string, value: unknown) {
  const basePrice = priceValue(value, "basePrice");
  const [updated] = await db.update(flavourGroups).set({ basePrice, updatedAt: new Date() })
    .where(eq(flavourGroups.key, key)).returning({ key: flavourGroups.key });
  if (!updated) throw new CatalogueAdminError("basePrice", "NOT_FOUND", "This catalogue item no longer exists.");
}

export async function updateAddonPrice(db: Db, key: string, value: unknown) {
  const price = priceValue(value, "price");
  const [updated] = await db.update(addons).set({ price, updatedAt: new Date() })
    .where(eq(addons.key, key)).returning({ key: addons.key });
  if (!updated) throw new CatalogueAdminError("price", "NOT_FOUND", "This catalogue item no longer exists.");
}

export async function updateDessertTypePrice(db: Db, key: string, value: unknown) {
  const price = priceValue(value, "price");
  const [updated] = await db.update(dessertTypes).set({ price, updatedAt: new Date() })
    .where(eq(dessertTypes.key, key)).returning({ key: dessertTypes.key });
  if (!updated) throw new CatalogueAdminError("price", "NOT_FOUND", "This catalogue item no longer exists.");
}

export async function updateSizeMultiplier(db: Db, size: number, value: unknown) {
  const multiplier = multiplierHundredths(value);
  const [updated] = await db.update(sizeMultipliers).set({ multiplier, updatedAt: new Date() })
    .where(eq(sizeMultipliers.size, size)).returning({ size: sizeMultipliers.size });
  if (!updated) throw new CatalogueAdminError("multiplier", "NOT_FOUND", "This cake size no longer exists.");
}

type EditableItemTable = typeof flavours | typeof frostings | typeof addons | typeof dessertTypes;

function itemName(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new CatalogueAdminError("name", "INVALID_NAME", "Enter a name.");
  }
  return value.trim();
}

function itemKey(name: string): string {
  const key = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!key) throw new CatalogueAdminError("name", "INVALID_NAME", "Use a name with letters or numbers.");
  return key;
}

async function assertUniqueName(db: Db, table: EditableItemTable, name: string, exceptKey?: string) {
  const [match] = await db.select({ key: table.key }).from(table)
    .where(sql`lower(${table.name}) = lower(${name})`).limit(1);
  if (match && match.key !== exceptKey) {
    throw new CatalogueAdminError("name", "DUPLICATE_NAME", "A catalogue item already has this name.");
  }
}

async function assertUnusedKey(db: Db, table: EditableItemTable, key: string) {
  const [match] = await db.select({ key: table.key }).from(table).where(eq(table.key, key)).limit(1);
  if (match) throw new CatalogueAdminError("name", "DUPLICATE_KEY", "This name conflicts with an existing catalogue key.");
}

async function renameItem(db: Db, table: EditableItemTable, key: string, input: unknown) {
  const name = itemName(input);
  await assertUniqueName(db, table, name, key);
  const [updated] = await db.update(table).set({ name, updatedAt: new Date() }).where(eq(table.key, key)).returning({ key: table.key });
  if (!updated) throw new CatalogueAdminError("name", "NOT_FOUND", "This catalogue item no longer exists.");
}

async function setItemActive(db: Db, table: EditableItemTable, key: string, active: boolean, lastActiveRule: boolean) {
  await db.transaction(async tx => {
    const [item] = await tx.select({ active: table.active }).from(table).where(eq(table.key, key)).for("update");
    if (!item) throw new CatalogueAdminError("active", "NOT_FOUND", "This catalogue item no longer exists.");
    if (!active && item.active && lastActiveRule) {
      const activeItems = await tx.select({ key: table.key }).from(table).where(eq(table.active, true)).for("update");
      if (activeItems.length <= 1) throw new CatalogueAdminError("active", "LAST_ACTIVE_ITEM", "At least one active option must remain.");
    }
    await tx.update(table).set({ active, updatedAt: new Date() }).where(eq(table.key, key));
  });
}

async function addSimpleItem(db: Db, table: typeof frostings | typeof addons, input: unknown) {
  const name = itemName(input);
  const key = itemKey(name);
  await assertUniqueName(db, table, name);
  await assertUnusedKey(db, table, key);
  await db.insert(table).values({ key, name });
  return key;
}

export async function addFlavour(db: Db, input: { name: unknown; group: unknown; diet?: unknown }) {
  const name = itemName(input.name);
  const groupKey = typeof input.group === "string" ? input.group : "";
  const diet = input.diet ?? "standard";
  if (diet !== "standard" && diet !== "vegan" && diet !== "diabetic") {
    throw new CatalogueAdminError("diet", "INVALID_DIET", "Choose a valid dietary category.");
  }
  const [group] = await db.select({ id: flavourGroups.id }).from(flavourGroups).where(eq(flavourGroups.key, groupKey)).limit(1);
  if (!group) throw new CatalogueAdminError("group", "INVALID_GROUP", "Choose a valid flavour group.");
  const key = itemKey(name);
  await assertUniqueName(db, flavours, name);
  await assertUnusedKey(db, flavours, key);
  await db.insert(flavours).values({ key, name, groupId: group.id, diet });
  return key;
}

export const renameFlavour = (db: Db, key: string, name: unknown) => renameItem(db, flavours, key, name);
export const renameFrosting = (db: Db, key: string, name: unknown) => renameItem(db, frostings, key, name);
export const renameAddon = (db: Db, key: string, name: unknown) => renameItem(db, addons, key, name);
export const renameDessertType = (db: Db, key: string, name: unknown) => renameItem(db, dessertTypes, key, name);

export const hideFlavour = (db: Db, key: string) => setItemActive(db, flavours, key, false, true);
export const hideFrosting = (db: Db, key: string) => setItemActive(db, frostings, key, false, true);
export const hideAddon = (db: Db, key: string) => setItemActive(db, addons, key, false, false);
export const hideDessertType = (db: Db, key: string) => setItemActive(db, dessertTypes, key, false, true);

export async function hideSize(db: Db, size: number) {
  await db.transaction(async tx => {
    const activeSizes = await tx.select({ size: sizeMultipliers.size }).from(sizeMultipliers)
      .where(eq(sizeMultipliers.active, true)).for("update");
    if (!activeSizes.some(item => item.size === size)) {
      const [exists] = await tx.select({ size: sizeMultipliers.size }).from(sizeMultipliers)
        .where(eq(sizeMultipliers.size, size)).limit(1);
      if (!exists) throw new CatalogueAdminError("active", "NOT_FOUND", "This cake size no longer exists.");
      return;
    }
    if (activeSizes.length <= 1) throw new CatalogueAdminError("active", "LAST_ACTIVE_ITEM", "At least one active option must remain.");
    await tx.update(sizeMultipliers).set({ active: false, updatedAt: new Date() }).where(eq(sizeMultipliers.size, size));
  });
}

export async function addFrosting(db: Db, name: unknown) { return addSimpleItem(db, frostings, name); }
export async function addAddon(db: Db, input: { name: unknown; price: unknown }) {
  const name = itemName(input.name);
  const key = itemKey(name);
  const price = priceValue(input.price, "price");
  await assertUniqueName(db, addons, name);
  await assertUnusedKey(db, addons, key);
  await db.insert(addons).values({ key, name, price });
  return key;
}

export async function addDessertType(db: Db, input: { name: unknown; price: unknown; flavourSuggestions?: unknown }) {
  const name = itemName(input.name);
  const key = itemKey(name);
  const price = priceValue(input.price, "price");
  const suggestions = input.flavourSuggestions ?? [];
  if (!Array.isArray(suggestions) || suggestions.some(value => typeof value !== "string" || !value.trim())) {
    throw new CatalogueAdminError("flavourSuggestions", "INVALID_SUGGESTIONS", "Enter flavour suggestions as names.");
  }
  await assertUniqueName(db, dessertTypes, name);
  await assertUnusedKey(db, dessertTypes, key);
  await db.insert(dessertTypes).values({ key, name, price, flavourSuggestions: suggestions.map(value => (value as string).trim()) });
  return key;
}

export async function updateDessertFlavourSuggestions(db: Db, key: string, input: unknown) {
  if (!Array.isArray(input) || input.some(value => typeof value !== "string" || !value.trim())) {
    throw new CatalogueAdminError("flavourSuggestions", "INVALID_SUGGESTIONS", "Enter flavour suggestions as names.");
  }
  const [updated] = await db.update(dessertTypes)
    .set({ flavourSuggestions: input.map(value => (value as string).trim()), updatedAt: new Date() })
    .where(eq(dessertTypes.key, key)).returning({ key: dessertTypes.key });
  if (!updated) throw new CatalogueAdminError("flavourSuggestions", "NOT_FOUND", "This dessert type no longer exists.");
}
