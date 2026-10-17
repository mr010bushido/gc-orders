## Why

The scaffold prices one cake. The agreed order is a basket: an optional cake plus any dessert lines, with at least one item, and one reference, deposit, delivery fee and status (PBS Q17). Dessert rules (30 per type, 5-day lead time, a short-notice surcharge when a cake is in the basket) and owner-priced quote lines are not in the engine yet. This is pure logic with no database, so it can be built and tested first.

## What Changes

- Add `lib/basket-pricing.ts` with `priceBasket(input, now)`, built on the existing `quote()` for the cake part.
- Desserts: K30 each, at least 30 per dessert type, flavours mixed freely inside a line (a free-text note, not priced).
- Dessert-only baskets need a 5-day lead time, measured from submission to 00:00 Africa/Lusaka on the event day. Under that they are refused.
- With a cake in the basket, desserts under 5 days are allowed with a +20% surcharge on the dessert subtotal. The cake's own 48-hour rush applies separately.
- One flat K150 delivery fee per order, whatever the basket holds.
- Owner-priced quote lines (positive whole Kwacha) are added to the total with no rush or surcharge, and count toward the 50% deposit.
- Return itemised lines (cake, rush, each add-on, each dessert, dessert surcharge, delivery, quote lines) that a later change snapshots onto the order.
- Export `earliestEventDate(hasCake, now)` and `isCakeRushDate(date, now)` for the date picker and server validation.
- Extend `quote()`'s result with a `lines` array without changing its existing fields.

Out of scope: reading prices from the database (`catalogue-pricing-config`) and any persistence.

## Capabilities

### New Capabilities
- `basket-pricing`: pricing of a mixed basket of cake, desserts, delivery and quote lines, the dessert lead-time and short-notice rules, and the date helpers.

### Modified Capabilities
None. `cake-pricing` (from `scaffold-nextjs-app`) is reused unchanged; only its returned object gains `lines`.

## Impact

- Modified: `lib/pricing.ts` (adds `lines`), new `lib/basket-pricing.ts` and test file.
- Prerequisite: `scaffold-nextjs-app` is archived so `cake-pricing` exists in `openspec/specs/`.
- Owner: Codex (backend logic). No other change must land first.
- Linear issue: created when the implementer is delegated.
