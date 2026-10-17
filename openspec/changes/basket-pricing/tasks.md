## 1. Extend the cake quote

- [x] 1.1 Add an enumerable `lines` array (cake, rush, one per add-on, delivery) to `quote()` without changing existing fields. Coordinator answer: YES, update the four exact-object assertions to accept `lines`; added `lines: expect.any(Array)` while retaining every existing value assertion because the new enumerable field changes the result shape. — gate: pnpm test lib/pricing.test.ts → 38 passed; pnpm lint, pnpm typecheck, openspec validate basket-pricing --strict → passed
- [ ] 1.2 Test that the line amounts of every `cake-pricing` scenario sum to its total

## 2. Basket pricing

- [ ] 2.1 Write `lib/basket-pricing.test.ts` from the `basket-pricing` scenarios (every scenario is a test), including the 23:30 UTC edge and a fractional surcharge rate
- [ ] 2.2 Implement `PricingError`, `DEFAULT_RULES` and `priceBasket(input, now, rules)` until the tests pass
- [ ] 2.3 Implement `earliestEventDate` and `isCakeRushDate` and their tests
- [ ] 2.4 Property-style check: for generated baskets the line amounts always sum to the total and the deposit is the rounded half of the unrounded total

## 3. Verify

- [ ] 3.1 `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass; `openspec validate basket-pricing --strict` passes
