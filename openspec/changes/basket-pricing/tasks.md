## 1. Extend the cake quote

- [x] 1.1 Add an enumerable `lines` array (cake, rush, one per add-on, delivery) to `quote()` without changing existing fields. Coordinator answer: YES, update the four exact-object assertions to accept `lines`; added `lines: expect.any(Array)` while retaining every existing value assertion because the new enumerable field changes the result shape. — gate: pnpm test lib/pricing.test.ts → 38 passed; pnpm lint, pnpm typecheck, openspec validate basket-pricing --strict → passed
- [x] 1.2 Test that the line amounts of every valid `cake-pricing` scenario sum to its total, plus fractional rush, duplicate add-ons, line ordering and JSON enumeration; rejection scenarios retain their existing rejection tests because they return no total. — gate: pnpm test lib/pricing.test.ts → 47 passed; pnpm lint, pnpm typecheck → passed; openspec validate basket-pricing --strict → passed

## 2. Basket pricing

- [ ] BLOCKED: With fractional rush and dessert surcharge, should basket total sum the rounded lines, or round the unrounded sum and allocate the rounding difference to a named line? — 2.1 Write `lib/basket-pricing.test.ts` from the `basket-pricing` scenarios (every scenario is a test), including the 23:30 UTC edge and a fractional surcharge rate. A rush classic 16-inch cake is K2249 + K449.80; 30 cupcakes are K900; a 20.06% dessert surcharge is K180.54. Half-up rounded lines sum to K3780, while the unrounded K3779.34 rounds to K3779. The spec requires lines to sum to total but does not choose between these policies; the design rounds amounts half-up and preserves the unrounded basis for the deposit. Check performed: node:assert/strict arithmetic reproduction confirmed both totals; no basket implementation or later tasks started.
- [ ] 2.2 Implement `PricingError`, `DEFAULT_RULES` and `priceBasket(input, now, rules)` until the tests pass
- [ ] 2.3 Implement `earliestEventDate` and `isCakeRushDate` and their tests
- [ ] 2.4 Property-style check: for generated baskets the line amounts always sum to the total and the deposit is the rounded half of the unrounded total

## 3. Verify

- [ ] 3.1 `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass; `openspec validate basket-pricing --strict` passes
