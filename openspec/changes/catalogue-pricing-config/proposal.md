## Why

Prices, multipliers, fees and the flavour list are module constants. The PRD requires the owner to change them without a developer (PRD Appendix B, PBS Q27), and each order must keep the prices it was booked at (Q28). This change moves the catalogue and settings into the database and makes the pricing functions take them as input. The owner screen to edit them is `owner-settings`.

## What Changes

- Add catalogue tables: flavour groups with base prices, flavours (with diet), frostings, size multipliers, add-ons, dessert types, and typed settings.
- Add a settings registry in code (key, type, default, bounds): max tiers, delivery fee, rush rate and window, dessert unit price rules, dessert lead days and surcharge, capacity per day, expiry hours, time-window hours, payment numbers, pickup map URL, owner alert phone.
- Add `pnpm db:seed`, which inserts the PRD Appendix A/B data and the setting defaults, never overwriting existing rows.
- Add `getCatalogue(db)` returning a typed, immutable catalogue, and `toPricingRules(catalogue)` which feeds `quote()` and `priceBasket()`.
- Change `quote()` to take its price tables as a parameter (defaulting to the current constants) and loosen its keys from literal unions to strings validated at runtime.
- Items can be hidden (`active = false`) without deleting, so old orders and snapshots stay valid.

Out of scope: the owner editing screens (`owner-settings`) and persisting order snapshots (`order-lifecycle`).

## Capabilities

### New Capabilities
- `catalogue`: the catalogue and settings model, defaults, seeding, validation of selections against it, and pricing from it.

### Modified Capabilities
None. `cake-pricing` behaviour is unchanged; the seeded catalogue must reproduce its scenarios exactly.

## Impact

- New: `lib/db/schema/catalogue.ts`, migration, `lib/catalogue/*`, seed script, tests.
- Modified: `lib/pricing.ts`, `lib/basket-pricing.ts` (rules parameter already exists), `package.json` (`db:seed`).
- Owner: Codex. Depends on `database-foundation` and `basket-pricing`.
- Linear issue: created when the implementer is delegated.
