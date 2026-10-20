import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { addons, dessertTypes, flavourGroups, sizeMultipliers } from "../db/schema";

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
