## 1. Model

- [ ] 1.1 Drizzle schema and migration for `flavour_groups`, `flavours`, `frostings`, `size_multipliers`, `addons`, `dessert_types`, `settings` (RLS enabled, conventions from `data-layer`)
- [ ] 1.2 `lib/catalogue/settings.ts` registry with types, defaults and bounds, and tests for bound checks
- [ ] 1.3 `lib/catalogue/defaults.ts` from PRD Appendix A/B and `pnpm db:seed` (idempotent, never overwrites), with a PGlite test for fresh and repeated seeds

## 2. Read model

- [ ] 2.1 `getCatalogue(db, { includeInactive })` returning an immutable typed catalogue, wrapped in React `cache` per request
- [ ] 2.2 `resolveFlavour` and the other lookups with error codes (`UNKNOWN_FLAVOUR`, `INACTIVE_ITEM`, …) and tests

## 3. Pricing from the catalogue

- [ ] 3.1 Add a rules parameter to `quote()` (default = current constants), loosen key types to strings with runtime checks, take the tier limit from rules; existing tests unchanged
- [ ] 3.2 `toPricingRules(catalogue)` and tests: the seeded catalogue reproduces every `cake-pricing` and `basket-pricing` scenario, and every PRD Appendix A price
- [ ] 3.3 Tests for changed base price, raised tier limit and inactive items excluded

## 4. Verify

- [ ] 4.1 `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass; `openspec validate catalogue-pricing-config --strict` passes
