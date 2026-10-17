## 1. Extend the cake quote

- [ ] BLOCKED: May the four exact-object assertions in lib/pricing.test.ts be updated to allow the new enumerable lines field while preserving all existing value checks? — 1.1 Add a `lines` array (cake, rush, one per add-on, delivery) to `quote()`'s result without changing existing fields; existing tests unchanged and passing. Existing toEqual assertions at lines 15, 21, 27 and 84 reject an additional enumerable field; hiding lines as non-enumerable would omit them from JSON snapshots. Baseline gate: pnpm test lib/pricing.test.ts → 38 passed; implementation not started.
- [ ] 1.2 Test that the line amounts of every `cake-pricing` scenario sum to its total

## 2. Basket pricing

- [ ] 2.1 Write `lib/basket-pricing.test.ts` from the `basket-pricing` scenarios (every scenario is a test), including the 23:30 UTC edge and a fractional surcharge rate
- [ ] 2.2 Implement `PricingError`, `DEFAULT_RULES` and `priceBasket(input, now, rules)` until the tests pass
- [ ] 2.3 Implement `earliestEventDate` and `isCakeRushDate` and their tests
- [ ] 2.4 Property-style check: for generated baskets the line amounts always sum to the total and the deposit is the rounded half of the unrounded total

## 3. Verify

- [ ] 3.1 `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass; `openspec validate basket-pricing --strict` passes
