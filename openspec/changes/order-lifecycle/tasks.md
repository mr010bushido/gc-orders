## 1. Phone and reference helpers

- [x] 1.1 `lib/phone.ts` `normaliseZambianMobile` with tests from the `phone-numbers` scenarios — gate: pnpm test lib/phone.test.ts → 13 passed
- [x] 1.2 Schema (`lib/db/schema/orders.ts`) and migration `drizzle/0004_orders.sql` for `orders`, `order_lines`, `pop_submissions`, `order_status_events`, `reference_counters` (RLS on; check constraints for status, fulfilment, time window, actor, and nullable PII columns allowed only when `anonymised_at` is set). Reading recorded: as the spec says, all six PII columns (name, phone, email, address, design notes, topper) are NOT NULL until anonymised, so absent optional text (pickup address, no notes, no topper) is stored as `''`; a delivery order also needs a non-blank address. Extra defensive checks: normalised phone format, deposit ≤ total, deadline present while `awaiting_payment`, flag only while `awaiting_verification`, balance time and method set together. `reference_counters` has a uuid `id` plus a unique `year` to meet the data-layer PK convention — gate: pnpm test lib/db/orders.test.ts lib/db/schema.test.ts lib/db/migrations.test.ts → 23 passed; pnpm typecheck, pnpm lint, pnpm check:portability → pass
- [x] 1.3 `lib/orders/reference.ts` allocating references in the caller's transaction (single upsert `on conflict (year) do update … returning`, which takes the row lock); PGlite tests for first of year, Lusaka year boundary, concurrency, rollback and five-digit numbers. Note: PGlite runs one connection, so the concurrency test proves 20 overlapping transactions get distinct consecutive numbers but not Postgres row-lock contention; the single-statement upsert is what makes that safe on Postgres — gate: pnpm test lib/orders/reference.test.ts → 5 passed; pnpm typecheck, pnpm lint → pass

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
