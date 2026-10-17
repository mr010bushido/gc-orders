import type { FullCatalogue } from "./catalogue";

export type LookupErrorCode = "UNKNOWN_FLAVOUR" | "UNKNOWN_FROSTING" | "UNKNOWN_SIZE" | "UNKNOWN_ADDON" | "UNKNOWN_DESSERT" | "INACTIVE_ITEM";
export type Lookup<T> = { ok: true; value: T } | { ok: false; code: LookupErrorCode };

// Lookups take the full catalogue (`getCatalogue(db, { includeInactive: true })`) so hidden items report INACTIVE_ITEM.
function full(catalogue: FullCatalogue): FullCatalogue {
  if (catalogue?.scope !== "full") throw new TypeError("lookups need the full catalogue (includeInactive: true)");
  return catalogue;
}

function find<T extends { active: boolean }>(items: readonly T[], match: (item: T) => boolean, unknown: LookupErrorCode): Lookup<T> {
  const item = items.find(match);
  if (!item) return { ok: false, code: unknown };
  return item.active ? { ok: true, value: item } : { ok: false, code: "INACTIVE_ITEM" };
}

/** Resolves a flavour key to its price group key. A flavour in a hidden group is inactive. */
export function resolveFlavour(catalogue: FullCatalogue, flavour: unknown): Lookup<string> {
  const found = find(full(catalogue).flavours, f => f.key === flavour, "UNKNOWN_FLAVOUR");
  if (!found.ok) return found;
  const group = find(catalogue.flavourGroups, g => g.key === found.value.group, "UNKNOWN_FLAVOUR");
  return group.ok ? { ok: true, value: group.value.key } : group;
}

export const resolveFrosting = (catalogue: FullCatalogue, frosting: unknown) => find(full(catalogue).frostings, f => f.key === frosting, "UNKNOWN_FROSTING");
export const resolveSize = (catalogue: FullCatalogue, size: unknown) => find(full(catalogue).sizes, s => s.size === size, "UNKNOWN_SIZE");
export const resolveAddon = (catalogue: FullCatalogue, addon: unknown) => find(full(catalogue).addons, a => a.key === addon, "UNKNOWN_ADDON");
export const resolveDessertType = (catalogue: FullCatalogue, dessert: unknown) => find(full(catalogue).dessertTypes, d => d.key === dessert, "UNKNOWN_DESSERT");
