import type { Catalogue } from "./catalogue";

export type LookupErrorCode = "UNKNOWN_FLAVOUR" | "UNKNOWN_FROSTING" | "UNKNOWN_SIZE" | "UNKNOWN_ADDON" | "UNKNOWN_DESSERT" | "INACTIVE_ITEM";
export type Lookup<T> = { ok: true; value: T } | { ok: false; code: LookupErrorCode };

// Pass the full catalogue (`includeInactive: true`) to tell hidden items apart from unknown ones.
function find<T extends { active: boolean }>(items: readonly T[], match: (item: T) => boolean, unknown: LookupErrorCode): Lookup<T> {
  const item = items.find(match);
  if (!item) return { ok: false, code: unknown };
  return item.active ? { ok: true, value: item } : { ok: false, code: "INACTIVE_ITEM" };
}

/** Resolves a flavour key to its price group key. A flavour in a hidden group is inactive. */
export function resolveFlavour(catalogue: Catalogue, flavour: unknown): Lookup<string> {
  const found = find(catalogue.flavours, f => f.key === flavour, "UNKNOWN_FLAVOUR");
  if (!found.ok) return found;
  const group = find(catalogue.flavourGroups, g => g.key === found.value.group, "UNKNOWN_FLAVOUR");
  return group.ok ? { ok: true, value: group.value.key } : group;
}

export const resolveFrosting = (catalogue: Catalogue, frosting: unknown) => find(catalogue.frostings, f => f.key === frosting, "UNKNOWN_FROSTING");
export const resolveSize = (catalogue: Catalogue, size: unknown) => find(catalogue.sizes, s => s.size === size, "UNKNOWN_SIZE");
export const resolveAddon = (catalogue: Catalogue, addon: unknown) => find(catalogue.addons, a => a.key === addon, "UNKNOWN_ADDON");
export const resolveDessertType = (catalogue: Catalogue, dessert: unknown) => find(catalogue.dessertTypes, d => d.key === dessert, "UNKNOWN_DESSERT");
