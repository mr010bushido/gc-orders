## 1. Phone and reference helpers

- [ ] 1.1 `lib/phone.ts` `normaliseZambianMobile` with tests from the `phone-numbers` scenarios
- [ ] 1.2 Schema and migration for `orders`, `order_lines`, `pop_submissions`, `order_status_events`, `reference_counters` (RLS on; check constraints for status, fulfilment, time window, actor, and nullable PII columns allowed only when `anonymised_at` is set)
- [ ] 1.3 `lib/orders/reference.ts` allocating references in the caller's transaction; PGlite tests for first of year, Lusaka year boundary, concurrency, rollback and five-digit numbers

## 2. Creation

- [ ] 2.1 zod schemas for each line kind's `meta`
- [ ] 2.2 `createOrder(db, input, now)` from a `basket-pricing` result: order, lines, first event, reference, token hash, payment deadline; tests for atomicity, snapshot stability and delivery address

## 3. Transitions

- [ ] 3.1 `lib/orders/transitions.ts` with the allowed-transition table (including `decline`) and compare-and-set updates writing events; tests for every legal and illegal pair and a concurrent verify
- [ ] 3.2 `submitPop` (validation, resubmission while flagged, `ORDER_EXPIRED`)
- [ ] 3.3 `setFlag` / `clearFlag`, verify-clears-flag, `markBalancePaid`, `complete` with `balanceUnpaid`, `markSeen`
- [ ] 3.4 `effectiveStatus`, `getTimeline` and `findOrderByToken` with tests

## 4. Verify

- [ ] 4.1 Schema checks from `data-layer` pass for the new tables; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass; `openspec validate order-lifecycle --strict` passes
