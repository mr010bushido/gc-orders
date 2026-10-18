import { z } from "zod";
import type { LineKind } from "../db/schema/orders";

const name = z.string().trim().min(1).max(200);
const empty = z.strictObject({});

/** Snapshot of what each line was for, so an order displays without the live catalogue. Names are copied, keys kept for reference. */
export const LINE_META = {
  cake: z.strictObject({
    flavourKey: name,
    flavour: name,
    diet: z.enum(["standard", "vegan", "diabetic"]),
    frostingKey: name,
    frosting: name,
    tiers: z.array(z.number().int().positive()).min(1),
  }),
  rush: empty,
  addon: z.strictObject({ key: name }),
  dessert: z.strictObject({ type: name, note: z.string().max(500).optional() }),
  dessert_surcharge: empty,
  delivery: empty,
  quote: empty,
} satisfies Record<LineKind, z.ZodType>;

export type LineMeta = { [K in LineKind]: z.infer<(typeof LINE_META)[K]> };

/** Validates a line's `meta` for its kind; used on write and read. Throws a ZodError when it does not match. */
export function parseLineMeta<K extends LineKind>(kind: K, meta: unknown): LineMeta[K] {
  return LINE_META[kind].parse(meta) as LineMeta[K];
}
