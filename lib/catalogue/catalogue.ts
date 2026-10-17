import { asc } from "drizzle-orm";
import { cache } from "react";
import type { Db } from "../db";
import { addons, dessertTypes, flavourGroups, flavours, frostings, settings, sizeMultipliers } from "../db/schema";
import { resolveSettings, type Settings } from "./settings";

type Item = { readonly key: string; readonly name: string; readonly active: boolean };

export type Catalogue = {
  readonly flavourGroups: readonly (Item & { readonly basePrice: number })[];
  readonly flavours: readonly (Item & { readonly group: string; readonly diet: "standard" | "vegan" | "diabetic" })[];
  readonly frostings: readonly Item[];
  readonly sizes: readonly { readonly size: number; readonly multiplier: number; readonly active: boolean }[];
  readonly addons: readonly (Item & { readonly price: number })[];
  readonly dessertTypes: readonly (Item & { readonly price: number; readonly flavourSuggestions: readonly string[] })[];
  readonly settings: Settings;
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/** Freezes a catalogue and, unless `includeInactive`, keeps only orderable items (a flavour also needs an active group). */
export function buildCatalogue(catalogue: Catalogue, includeInactive: boolean): Catalogue {
  if (includeInactive) return deepFreeze(catalogue);
  const activeGroups = new Set(catalogue.flavourGroups.filter(g => g.active).map(g => g.key));
  return deepFreeze({
    flavourGroups: catalogue.flavourGroups.filter(g => g.active),
    flavours: catalogue.flavours.filter(f => f.active && activeGroups.has(f.group)),
    frostings: catalogue.frostings.filter(f => f.active),
    sizes: catalogue.sizes.filter(s => s.active),
    addons: catalogue.addons.filter(a => a.active),
    dessertTypes: catalogue.dessertTypes.filter(d => d.active),
    settings: catalogue.settings,
  });
}

// Per-request memo only (React `cache`); nothing is cached across requests, so owner edits apply to the next booking.
const loadCatalogue = cache(async (db: Db, includeInactive: boolean): Promise<Catalogue> => {
  const [groupRows, flavourRows, frostingRows, sizeRows, addonRows, dessertRows, settingRows] = await Promise.all([
    db.select().from(flavourGroups).orderBy(asc(flavourGroups.sortOrder), asc(flavourGroups.key)),
    db.select().from(flavours).orderBy(asc(flavours.sortOrder), asc(flavours.key)),
    db.select().from(frostings).orderBy(asc(frostings.sortOrder), asc(frostings.key)),
    db.select().from(sizeMultipliers).orderBy(asc(sizeMultipliers.sortOrder), asc(sizeMultipliers.size)),
    db.select().from(addons).orderBy(asc(addons.sortOrder), asc(addons.key)),
    db.select().from(dessertTypes).orderBy(asc(dessertTypes.sortOrder), asc(dessertTypes.key)),
    db.select({ key: settings.key, value: settings.value }).from(settings),
  ]);
  const groupKeys = new Map(groupRows.map(g => [g.id, g.key]));
  return buildCatalogue({
    flavourGroups: groupRows.map(({ key, name, basePrice, active }) => ({ key, name, basePrice, active })),
    flavours: flavourRows.map(({ key, name, groupId, diet, active }) => ({ key, name, group: groupKeys.get(groupId)!, diet, active })),
    frostings: frostingRows.map(({ key, name, active }) => ({ key, name, active })),
    sizes: sizeRows.map(({ size, multiplier, active }) => ({ size, multiplier, active })),
    addons: addonRows.map(({ key, name, price, active }) => ({ key, name, price, active })),
    dessertTypes: dessertRows.map(({ key, name, price, flavourSuggestions, active }) => ({ key, name, price, flavourSuggestions, active })),
    settings: resolveSettings(settingRows),
  }, includeInactive);
});

export function getCatalogue(db: Db, { includeInactive = false }: { includeInactive?: boolean } = {}): Promise<Catalogue> {
  return loadCatalogue(db, includeInactive);
}
