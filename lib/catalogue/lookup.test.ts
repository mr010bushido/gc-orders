import { describe, expect, it } from "vitest";
import { buildCatalogue, defaultCatalogue, type FullCatalogue } from "./catalogue";
import { resolveAddon, resolveDessertType, resolveFlavour, resolveFrosting, resolveSize } from "./lookup";

function hide(catalogue: FullCatalogue, list: "flavourGroups" | "flavours" | "frostings" | "addons" | "dessertTypes", key: string): FullCatalogue {
  return buildCatalogue({ ...catalogue, [list]: catalogue[list].map(item => item.key === key ? { ...item, active: false } : item) }, true);
}

describe("catalogue lookups", () => {
  const catalogue = defaultCatalogue();

  it("resolves a flavour to its price group", () => {
    expect(resolveFlavour(catalogue, "vanilla")).toEqual({ ok: true, value: "classic" });
    expect(resolveFlavour(catalogue, "diabetic_lemon")).toEqual({ ok: true, value: "vegan_diabetic" });
  });

  it("returns a distinct code for each unknown item", () => {
    expect(resolveFlavour(catalogue, "durian")).toEqual({ ok: false, code: "UNKNOWN_FLAVOUR" });
    expect(resolveFlavour(catalogue, "classic")).toEqual({ ok: false, code: "UNKNOWN_FLAVOUR" });
    expect(resolveFrosting(catalogue, "ganache")).toEqual({ ok: false, code: "UNKNOWN_FROSTING" });
    expect(resolveSize(catalogue, 9)).toEqual({ ok: false, code: "UNKNOWN_SIZE" });
    expect(resolveSize(catalogue, "10")).toEqual({ ok: false, code: "UNKNOWN_SIZE" });
    expect(resolveAddon(catalogue, "fruit_toppings")).toEqual({ ok: false, code: "UNKNOWN_ADDON" });
    expect(resolveDessertType(catalogue, "eclairs")).toEqual({ ok: false, code: "UNKNOWN_DESSERT" });
  });

  it("returns INACTIVE_ITEM for hidden items and flavours in a hidden group", () => {
    expect(resolveFrosting(hide(catalogue, "frostings", "fino_whip"), "fino_whip")).toEqual({ ok: false, code: "INACTIVE_ITEM" });
    expect(resolveFlavour(hide(catalogue, "flavours", "lemon"), "lemon")).toEqual({ ok: false, code: "INACTIVE_ITEM" });
    expect(resolveFlavour(hide(catalogue, "flavourGroups", "fruit"), "traditional_fruit_cake")).toEqual({ ok: false, code: "INACTIVE_ITEM" });
    expect(resolveAddon(hide(catalogue, "addons", "gloss_print"), "gloss_print")).toEqual({ ok: false, code: "INACTIVE_ITEM" });
    expect(resolveDessertType(hide(catalogue, "dessertTypes", "brownies"), "brownies")).toEqual({ ok: false, code: "INACTIVE_ITEM" });
    const sizes = buildCatalogue({ ...catalogue, sizes: catalogue.sizes.map(s => s.size === 16 ? { ...s, active: false } : s) }, true);
    expect(resolveSize(sizes, 16)).toEqual({ ok: false, code: "INACTIVE_ITEM" });
  });

  it("matches resolved items by their stored values", () => {
    expect(resolveSize(catalogue, 12)).toEqual({ ok: true, value: { size: 12, multiplier: 120, active: true } });
    expect(resolveFrosting(catalogue, "fino_whip")).toMatchObject({ ok: true, value: { name: "Fino Whip" } });
  });
});
