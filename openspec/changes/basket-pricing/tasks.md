## 1. Extend the cake quote

- [x] 1.1 Add an enumerable `lines` array (cake, rush, one per add-on, delivery) to `quote()` without changing existing fields. Coordinator answer: YES, update the four exact-object assertions to accept `lines`; added `lines: expect.any(Array)` while retaining every existing value assertion because the new enumerable field changes the result shape. — gate: pnpm test lib/pricing.test.ts → 38 passed; pnpm lint, pnpm typecheck, openspec validate basket-pricing --strict → passed
- [x] 1.2 Test that the line amounts of every valid `cake-pricing` scenario sum to its total, plus fractional rush, duplicate add-ons, line ordering and JSON enumeration; rejection scenarios retain their existing rejection tests because they return no total. — gate: pnpm test lib/pricing.test.ts → 47 passed; pnpm lint, pnpm typecheck → passed; openspec validate basket-pricing --strict → passed

## 2. Basket pricing

- [x] 2.1 Write `lib/basket-pricing.test.ts` from every `basket-pricing` scenario, including the 23:30 UTC edge and a fractional surcharge rate. Coordinator answer: total sums rounded lines; deposit halves the unrounded hundredths sum and rounds once; no line absorbs a rounding difference. Recorded this in design.md and pinned the 20.06% case to total K3780 and deposit K1890. Date-helper scenarios are declared here as three todos and activated with their implementation in task 2.3; test-first tasks 2.1 and 2.2 were gated together after implementation. — gate: pnpm test lib/pricing.test.ts lib/basket-pricing.test.ts → 119 passed, 3 date-helper todos deferred to 2.3; pnpm lint, pnpm typecheck, openspec validate basket-pricing --strict → passed
- [x] 2.2 Implement `PricingError`, `DEFAULT_RULES` and `priceBasket(input, now, rules)` with runtime input/rule validation and safe integer hundredths. Extended cake lines with `amountHundredths` for lossless composition rather than duplicating rush logic; documented basis-point rate units and raw line amounts in design.md. — gate: pnpm test lib/pricing.test.ts lib/basket-pricing.test.ts → 119 passed, 3 date-helper todos deferred to 2.3; pnpm lint, pnpm typecheck, openspec validate basket-pricing --strict → passed
- [x] 2.3 Implement `earliestEventDate` and `isCakeRushDate` and their tests; activated all three date-helper scenarios, checked midnight/year/leap-day rollover, exact 5-day and 48-hour boundaries, invalid dates and server validation agreement. — gate: pnpm test lib/pricing.test.ts lib/basket-pricing.test.ts → 131 passed, no todos; TZ=Pacific/Honolulu pnpm test lib/basket-pricing.test.ts → 84 passed; pnpm lint, pnpm typecheck, openspec validate basket-pricing --strict → passed
- [ ] 2.4 Property-style check: for generated baskets the line amounts always sum to the total and the deposit is the rounded half of the unrounded total

## 3. Verify

- [ ] 3.1 `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass; `openspec validate basket-pricing --strict` passes
