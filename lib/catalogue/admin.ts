import { eq, sql } from "drizzle-orm";
import type { Db } from "../db";
import { addons, dessertTypes, flavourGroups, flavours, frostings, settings, sizeMultipliers } from "../db/schema";
import { normaliseZambianMobile } from "../phone";
import { checkSetting, type SettingKey } from "./settings";

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

export type PriceSectionInput = {
  flavourGroupPrices: Record<string, unknown>;
  addonPrices: Record<string, unknown>;
  dessertPrices: Record<string, unknown>;
  sizeMultipliers: Record<string, unknown>;
};

function entries(value: unknown, field: string): [string, unknown][] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CatalogueAdminError(field, "INVALID_SECTION", "Enter all prices in this section.");
  }
  return Object.entries(value as Record<string, unknown>);
}

export async function savePricesSection(db: Db, input: PriceSectionInput) {
  const groups = entries(input?.flavourGroupPrices, "flavourGroupPrices").map(([key, value]) => [key, priceValue(value, `flavourGroupPrices.${key}`)] as const);
  const addonPrices = entries(input?.addonPrices, "addonPrices").map(([key, value]) => [key, priceValue(value, `addonPrices.${key}`)] as const);
  const dessertPrices = entries(input?.dessertPrices, "dessertPrices").map(([key, value]) => [key, priceValue(value, `dessertPrices.${key}`)] as const);
  const sizes = entries(input?.sizeMultipliers, "sizeMultipliers").map(([key, value]) => {
    if (!/^[1-9]\d*$/.test(key) || !Number.isSafeInteger(Number(key))) {
      throw new CatalogueAdminError(`sizeMultipliers.${key}`, "INVALID_SIZE", "Choose a valid cake size.");
    }
    multiplierHundredths(value, `sizeMultipliers.${key}`);
    return [Number(key), value] as const;
  });
  await db.transaction(async tx => {
    const txDb = tx as unknown as Db;
    for (const [key, price] of groups) await updateFlavourGroupPrice(txDb, key, price);
    for (const [key, price] of addonPrices) await updateAddonPrice(txDb, key, price);
    for (const [key, price] of dessertPrices) await updateDessertTypePrice(txDb, key, price);
    for (const [size, multiplier] of sizes) await updateSizeMultiplier(txDb, size, multiplier);
  });
}

const RULE_KEYS = [
  "delivery_fee", "rush_rate_percent", "rush_window_hours", "dessert_min_quantity", "dessert_lead_days",
  "dessert_surcharge_percent", "max_tiers", "capacity_per_day", "payment_expiry_hours",
] as const satisfies readonly SettingKey[];

const TIME_KEYS = [
  "morning_start_hour", "morning_end_hour", "afternoon_start_hour", "afternoon_end_hour", "evening_start_hour", "evening_end_hour",
] as const satisfies readonly SettingKey[];

type SectionInput<K extends readonly SettingKey[]> = Record<K[number], unknown>;

async function saveSettingValues(db: Db, values: readonly { key: SettingKey; value: string | number | null }[]) {
  const updatedAt = new Date();
  await db.transaction(async tx => {
    for (const { key, value } of values) {
      await tx.insert(settings).values({ key, value, updatedAt }).onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt },
      });
    }
  });
}

function validateSection<K extends readonly SettingKey[]>(input: unknown, keys: K): { key: K[number]; value: string | number | null }[] {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new CatalogueAdminError("_form", "INVALID_SECTION", "Enter all settings in this section.");
  }
  const object = input as Record<string, unknown>;
  for (const key of keys) {
    if (!Object.hasOwn(object, key)) throw new CatalogueAdminError(key, "REQUIRED", "This setting is required.");
  }
  const extra = Object.keys(object).find(key => !(keys as readonly string[]).includes(key));
  if (extra) throw new CatalogueAdminError(extra, "UNKNOWN_SETTING", "This setting cannot be changed here.");
  return keys.map(key => {
    try {
      const raw = object[key];
      const value = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : raw;
      return { key, value: checkSetting(key, value) };
    } catch (error) {
      throw new CatalogueAdminError(key, "OUT_OF_RANGE", (error as Error).message);
    }
  });
}

export async function saveRulesSettings(db: Db, input: SectionInput<typeof RULE_KEYS>) {
  await saveSettingValues(db, validateSection(input, RULE_KEYS));
}

function minutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export async function saveTimeWindowSettings(db: Db, input: SectionInput<typeof TIME_KEYS>) {
  const values = validateSection(input, TIME_KEYS);
  const times = Object.fromEntries(values.map(entry => [entry.key, entry.value])) as Record<(typeof TIME_KEYS)[number], string>;
  const windows = ["morning", "afternoon", "evening"] as const;
  let previousEnd = -1;
  for (const window of windows) {
    const startKey = `${window}_start_hour` as (typeof TIME_KEYS)[number];
    const endKey = `${window}_end_hour` as (typeof TIME_KEYS)[number];
    const start = minutes(times[startKey]);
    const end = minutes(times[endKey]);
    if (start >= end) throw new CatalogueAdminError(endKey, "WINDOW_ORDER", "The end time must be after the start time.");
    if (start < previousEnd) throw new CatalogueAdminError(startKey, "WINDOWS_OVERLAP", "Time windows must not overlap and stay in morning, afternoon, evening order.");
    previousEnd = end;
  }
  await saveSettingValues(db, values);
}

export async function savePaymentSettings(db: Db, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new CatalogueAdminError("_form", "INVALID_SECTION", "Enter all payment and contact settings.");
  }
  const fields = input as Record<string, unknown>;
  for (const key of ["airtel_number", "mtn_number", "pickup_map_url", "owner_alert_phone"]) {
    if (!Object.hasOwn(fields, key)) throw new CatalogueAdminError(key, "REQUIRED", "This setting is required.");
  }
  if (Object.keys(fields).some(key => !["airtel_number", "mtn_number", "pickup_map_url", "owner_alert_phone"].includes(key))) {
    throw new CatalogueAdminError("_form", "UNKNOWN_SETTING", "This setting cannot be changed here.");
  }
  const airtel = typeof fields.airtel_number === "string" ? normaliseZambianMobile(fields.airtel_number) : null;
  const mtn = typeof fields.mtn_number === "string" ? normaliseZambianMobile(fields.mtn_number) : null;
  const alertInput = typeof fields.owner_alert_phone === "string" ? fields.owner_alert_phone.trim() : "";
  const alert = alertInput ? normaliseZambianMobile(alertInput) : null;
  if (!airtel) throw new CatalogueAdminError("airtel_number", "INVALID_PHONE", "Enter a valid Zambian mobile number.");
  if (!mtn) throw new CatalogueAdminError("mtn_number", "INVALID_PHONE", "Enter a valid Zambian mobile number.");
  if (alertInput && !alert) throw new CatalogueAdminError("owner_alert_phone", "INVALID_PHONE", "Enter a valid Zambian mobile number or leave this blank.");
  if (typeof fields.pickup_map_url !== "string") {
    throw new CatalogueAdminError("pickup_map_url", "INVALID_URL", "Enter an HTTPS pickup map link.");
  }
  let url: URL;
  try { url = new URL(fields.pickup_map_url.trim()); }
  catch { throw new CatalogueAdminError("pickup_map_url", "INVALID_URL", "Enter an HTTPS pickup map link."); }
  if (url.protocol !== "https:" || !url.hostname) {
    throw new CatalogueAdminError("pickup_map_url", "INVALID_URL", "Enter an HTTPS pickup map link.");
  }
  await saveSettingValues(db, [
    { key: "airtel_number", value: airtel },
    { key: "mtn_number", value: mtn },
    { key: "pickup_map_url", value: url.toString() },
    { key: "owner_alert_phone", value: alert },
  ]);
}
