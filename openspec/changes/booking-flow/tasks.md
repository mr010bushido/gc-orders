## 1. Contract (Codex)

- [x] 1.1 `lib/booking/schema.ts`: request zod schema, error code list and response types; commit first, the screens import these types — gate: `pnpm typecheck` → passed
- [x] 1.2 `lib/booking/create-booking.ts`: validation, catalogue load, `priceBasket`, date rules, `assertDateOpen`, `createOrder`; PGlite tests for every `booking-submission` scenario — gates: `pnpm test lib/booking/create-booking.test.ts` → 7 passed; `pnpm typecheck` → passed; `pnpm lint` → passed; `openspec validate booking-flow --strict` → valid
- [x] 1.3 Honeypot rejection with tests, including 11 valid service submissions accepted without an IP-based limit; no client IP contract was added. Keep event-date capacity behavior unchanged — gates: `pnpm test lib/booking/create-booking.test.ts` → 9 passed; `pnpm typecheck` → passed; `pnpm lint` → passed; `openspec validate booking-flow --strict` → valid
- [x] 1.4 The server action in `app/book/actions.ts` wraps 1.2 and schedules both notifications with Next `after()` after commit; tests cover redacted logs and provider failure — gates: focused tests → 11 passed; `pnpm lint` → passed; `pnpm typecheck` → passed; `pnpm test --maxWorkers=1` → 576 passed, 1 skipped; default `pnpm test` → existing PGlite worker startup timeouts also recorded on develop; `pnpm build` → passed; `pnpm check:portability` → passed; `openspec validate booking-flow --strict` → valid

## 2. Screens (Claude)

- [ ] 2.1 Landing page and the `/book` wizard shell with stepper and `sessionStorage` state
- [ ] 2.2 Step 1 Choose items (cake picker, frosting, dessert lines)
- [ ] 2.3 Step 2 Cake details (tiers, add-ons, notes, topper text, running price)
- [ ] 2.4 Step 3 Delivery and details (radio cards, date picker, time window, contact fields, rush banner)
- [ ] 2.5 Step 4 Review (summary card, privacy note, single submit) and the confirmation screen with payment instructions
- [ ] 2.6 Component tests for each step, including error focus and double submit

## 3. Integration (Claude owns this check)

- [ ] 3.1 End-to-end test drives the wizard to a created order against the action with a PGlite database, and compares the review total with the stored total
- [ ] 3.2 Check at 375px in light and dark and note the result on this line
- [ ] 3.3 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass; `openspec validate booking-flow --strict` passes
