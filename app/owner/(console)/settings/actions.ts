"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "../../../../lib/auth/require-owner";
import { getDb } from "../../../../lib/db";
import {
  addAddon, addDessertType, addFlavour, addFrosting, CatalogueAdminError, hideAddon, hideDessertType,
  hideFlavour, hideFrosting, hideSize, renameAddon, renameDessertType, renameFlavour, renameFrosting,
  savePaymentSettings, savePricesSection, saveRulesSettings, saveTimeWindowSettings, updateDessertFlavourSuggestions,
  type PriceSectionInput,
} from "../../../../lib/catalogue/admin";

export type SettingsActionResult = { ok: true } | {
  ok: false;
  errors: Record<string, { code: string; message: string }>;
};

async function run(work: () => Promise<unknown>): Promise<SettingsActionResult> {
  try {
    await work();
    revalidatePath("/owner/settings");
    revalidatePath("/book");
    return { ok: true };
  } catch (error) {
    if (!(error instanceof CatalogueAdminError)) throw error;
    return { ok: false, errors: { [error.field]: { code: error.code, message: error.message } } };
  }
}

export async function savePrices(input: PriceSectionInput): Promise<SettingsActionResult> {
  await requireOwner();
  return run(() => savePricesSection(getDb(), input));
}

export async function saveFeesAndRules(input: Record<string, unknown>): Promise<SettingsActionResult> {
  await requireOwner();
  return run(() => saveRulesSettings(getDb(), input as Parameters<typeof saveRulesSettings>[1]));
}

export async function saveTimeWindows(input: Record<string, unknown>): Promise<SettingsActionResult> {
  await requireOwner();
  return run(() => saveTimeWindowSettings(getDb(), input as Parameters<typeof saveTimeWindowSettings>[1]));
}

export async function savePaymentAndContact(input: unknown): Promise<SettingsActionResult> {
  await requireOwner();
  return run(() => savePaymentSettings(getDb(), input));
}

export type CatalogueItemKind = "flavour" | "frosting" | "addon" | "dessert" | "size";
export type CatalogueItemAction =
  | { kind: "flavour"; operation: "add"; name: unknown; group: unknown; diet?: unknown }
  | { kind: "frosting"; operation: "add"; name: unknown }
  | { kind: "addon"; operation: "add"; name: unknown; price: unknown }
  | { kind: "dessert"; operation: "add"; name: unknown; price: unknown; flavourSuggestions?: unknown }
  | { kind: Exclude<CatalogueItemKind, "size">; operation: "rename"; key: string; name: unknown }
  | { kind: Exclude<CatalogueItemKind, "size">; operation: "hide"; key: string }
  | { kind: "dessert"; operation: "suggestions"; key: string; flavourSuggestions: unknown }
  | { kind: "size"; operation: "hide"; size: number };

export async function manageCatalogueItem(value: unknown): Promise<SettingsActionResult> {
  await requireOwner();
  return run(async () => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new CatalogueAdminError("_form", "INVALID_ACTION", "Choose a valid catalogue action.");
    }
    const input = value as CatalogueItemAction;
    if (!("kind" in input) || !("operation" in input)) {
      throw new CatalogueAdminError("_form", "INVALID_ACTION", "Choose a valid catalogue action.");
    }
    const validAction = [
      "flavour:add", "flavour:rename", "flavour:hide", "frosting:add", "frosting:rename", "frosting:hide",
      "addon:add", "addon:rename", "addon:hide", "dessert:add", "dessert:rename", "dessert:hide",
      "dessert:suggestions", "size:hide",
    ].includes(`${input.kind}:${input.operation}`);
    if (!validAction) throw new CatalogueAdminError("_form", "INVALID_ACTION", "Choose a valid catalogue action.");
    const db = getDb();
    switch (input.kind) {
      case "flavour":
        if (input.operation === "add") return addFlavour(db, input);
        if (input.operation === "rename") return renameFlavour(db, input.key, input.name);
        return hideFlavour(db, input.key);
      case "frosting":
        if (input.operation === "add") return addFrosting(db, input.name);
        if (input.operation === "rename") return renameFrosting(db, input.key, input.name);
        return hideFrosting(db, input.key);
      case "addon":
        if (input.operation === "add") return addAddon(db, input);
        if (input.operation === "rename") return renameAddon(db, input.key, input.name);
        return hideAddon(db, input.key);
      case "dessert":
        if (input.operation === "add") return addDessertType(db, input);
        if (input.operation === "rename") return renameDessertType(db, input.key, input.name);
        if (input.operation === "suggestions") return updateDessertFlavourSuggestions(db, input.key, input.flavourSuggestions);
        return hideDessertType(db, input.key);
      case "size":
        return hideSize(db, input.size);
    }
  });
}
