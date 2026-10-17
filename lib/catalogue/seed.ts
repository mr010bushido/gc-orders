// Explicit .ts imports so `pnpm db:seed` runs on Node's built-in type stripping.
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { addons, dessertTypes, flavourGroups, flavours, frostings, settings, sizeMultipliers } from "../db/schema/catalogue.ts";
import { DEFAULT_CATALOGUE as D } from "./defaults.ts";
import { SETTINGS } from "./settings.ts";

/** Inserts the default catalogue and settings. Existing rows are never overwritten or duplicated. */
export async function seedCatalogue(db: PgDatabase<PgQueryResultHKT>) {
  const order = <T>(items: readonly T[]) => items.map((item, sortOrder) => ({ ...item, sortOrder }));
  await db.transaction(async (tx) => {
    await tx.insert(flavourGroups).values(order(D.flavourGroups)).onConflictDoNothing();
    const groupIds = new Map((await tx.select({ id: flavourGroups.id, key: flavourGroups.key }).from(flavourGroups)).map(g => [g.key, g.id]));
    await tx.insert(flavours).values(order(D.flavours).map(({ group, ...flavour }) => ({ ...flavour, groupId: groupIds.get(group)! }))).onConflictDoNothing();
    await tx.insert(frostings).values(order(D.frostings)).onConflictDoNothing();
    await tx.insert(sizeMultipliers).values(order(D.sizes)).onConflictDoNothing();
    await tx.insert(addons).values(order(D.addons)).onConflictDoNothing();
    await tx.insert(dessertTypes).values(order(D.dessertTypes).map(d => ({ ...d, flavourSuggestions: [...d.flavourSuggestions] }))).onConflictDoNothing();
    await tx.insert(settings).values(Object.entries(SETTINGS).map(([key, setting]) => ({ key, value: setting.default }))).onConflictDoNothing();
  });
}
