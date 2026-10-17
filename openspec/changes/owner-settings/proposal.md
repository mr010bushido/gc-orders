## Why

The owner must change prices, multipliers, fees and rules without a developer (PRD Appendix B, PBS Q27). `catalogue-pricing-config` stores them; the owner needs screens and safe write operations.

## What Changes

- `/owner/settings` with sections: Prices (flavour groups, flavours, frostings, add-ons, dessert types), Sizes (multipliers), Fees and rules (delivery fee, rush rate and window, dessert minimum, lead days and surcharge, maximum tiers, capacity per day, payment expiry hours), Time windows (morning, afternoon, evening hours), and Payment and contact (Airtel and MTN numbers, pickup map link, owner alert phone).
- Add, rename, reprice and hide flavours, frostings, add-ons and dessert types (with flavour suggestions). Nothing is deleted; hidden items stay for existing orders.
- Every write is validated against the settings registry and returns field errors. Phone numbers are normalised to `+260…`.
- A notice on each section: changes apply to new bookings only.

Out of scope: reordering items, price history, bulk import, editing existing orders' prices.

## Capabilities

### New Capabilities
- `owner-settings`: catalogue and settings management for the owner.

### Modified Capabilities
None.

## Impact

- New: `lib/catalogue/admin.ts`, `app/owner/settings/*`, server actions, tests.
- Cross-cutting: Codex owns the write functions and actions; Claude owns the screens and the integration check.
- Depends on `catalogue-pricing-config`, `owner-auth`, `design-system-components`.
- Linear issue: created when the implementer is delegated.
