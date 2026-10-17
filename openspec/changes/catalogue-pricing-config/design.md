## Context

`lib/pricing.ts` holds `FLAVOUR_PRICE`, `SIZE_MULTIPLIER`, `ADDON_PRICE`, the delivery fee and rush rate as constants. `basket-pricing` adds dessert rules as a `rules` parameter with defaults. The PRD price list has 13 flavours in three price tiers, six special-diet bakes at K1,700, three frostings, five sizes, three add-ons and eleven dessert types.

## Goals / Non-Goals

**Goals:**
- Everything the owner may edit lives in the database with sensible defaults and bounds.
- Pricing stays a pure function; the database is read once per request and passed in.

**Non-Goals:**
- Owner UI, caching across requests (an owner edit must apply to the next booking), per-customer pricing, the deposit percentage (fixed at 50%).

## Decisions

- **Flavours belong to price groups.** `flavour_groups` holds the base price (classic, signature, fruit, vegan_diabetic); each flavour points at one. The owner changes a price once for the group. Special-diet bakes are flavours with `diet` of `vegan` or `diabetic` in the `vegan_diabetic` group.
- **Multipliers stored in hundredths.** `80, 100, 120, 144, 173`, as integers, matching the engine's integer maths. The UI shows `0.80x`.
- **Settings as a key/value table with a code registry.** Each key has a type, default, min and max in `lib/catalogue/settings.ts`. A new setting is a registry entry, not a migration. Alternative considered: one wide settings row; rejected because adding a setting then needs a migration and a type change for the owner screen. Only maximum tiers has an agreed business range (default 3, 1 to 5); other numbers are checked for technical validity only (non-negative safe integers), and the morning, afternoon and evening window hours stay unset (null) until the owner sets them, which must happen before customer booking goes live.
- **Seed never overwrites.** `insert … on conflict do nothing`, so re-running it after the owner has edited prices is safe. The same `defaults.ts` feeds the seed and the tests, so tests do not need a database to check the default catalogue.
- **Hide, don't delete.** `active = false` removes an item from new bookings. Orders snapshot their lines (`order-lifecycle`), so nothing references the live catalogue row for price.
- **Request-scoped read.** `getCatalogue` is wrapped with React `cache` for one render pass only. No cross-request cache, so edits apply immediately.
- **Flavour validation lives here.** `resolveFlavour(catalogue, flavourId)` returns the group key or an `UNKNOWN_FLAVOUR` / `INACTIVE_ITEM` error; booking actions call it before pricing.

## Risks / Trade-offs

- [Seed data typo changes prices] → A test asserts the default catalogue reproduces every `cake-pricing` scenario and every PRD Appendix A price.
- [Owner sets a nonsense value] → Registry bounds are enforced on write (`owner-settings`) and again on read, falling back to the default with a logged warning.
- [Loosening `QuoteInput` types] → Runtime validation already rejects unknown keys; tests cover unknown group, size and add-on.
