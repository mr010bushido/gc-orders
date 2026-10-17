import { expect, it } from "vitest";
import { parseLineMeta } from "./line-meta";

const cake = { flavourKey: "vanilla", flavour: "Vanilla", diet: "standard", frostingKey: "buttercream", frosting: "Buttercream", tiers: [8, 10] };

it("accepts valid meta for each kind", () => {
  expect(parseLineMeta("cake", cake)).toEqual(cake);
  expect(parseLineMeta("addon", { key: "edible_print" })).toEqual({ key: "edible_print" });
  expect(parseLineMeta("dessert", { type: "cupcakes", note: "10 vanilla, 20 lemon" })).toEqual({ type: "cupcakes", note: "10 vanilla, 20 lemon" });
  for (const kind of ["rush", "dessert_surcharge", "delivery", "quote"] as const) expect(parseLineMeta(kind, {})).toEqual({});
});

it.each<[Parameters<typeof parseLineMeta>[0], unknown]>([
  ["cake", { ...cake, tiers: [] }],
  ["cake", { ...cake, diet: "keto" }],
  ["cake", { ...cake, tiers: [8.5] }],
  ["cake", { ...cake, extra: true }],
  ["addon", {}],
  ["dessert", { type: "" }],
  ["delivery", { fee: 150 }],
  ["quote", null],
])("rejects invalid %s meta", (kind, meta) => {
  expect(() => parseLineMeta(kind, meta)).toThrow();
});
