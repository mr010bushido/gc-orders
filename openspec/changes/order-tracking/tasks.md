## 1. Access and lookup (Codex)

- [x] 1.1 `lib/orders/access.ts`: token verification, masking helpers, not-found equivalence; tests — gate: `pnpm test lib/orders/access.test.ts` → 4 passed; `pnpm lint` → passed; `openspec validate order-tracking --strict` → valid
- [x] 1.2 `findMyBooking(reference, phone)` using `normaliseZambianMobile`, the rate limiter and the SMS sender from `notifications`; also preserve the current token when `APP_URL` is absent so a lookup cannot invalidate the link without sending a replacement — gate: `pnpm test lib/orders/access.test.ts` → 5 passed; `pnpm lint` → passed; `openspec validate order-tracking --strict` → valid
- [x] 1.3 `submitPopAction(token, text)` calling `submitPop` and scheduling `notify('pop_received')` and `notify('owner_pop_submitted')` with `after()` after the response; tests for expired, flagged, too-short text and a provider failure — gate: `pnpm test app/order/actions.test.ts` → 4 passed; `pnpm lint` → passed; `openspec validate order-tracking --strict` → valid
- [x] 1.4 Set `Cache-Control: no-store` and `Referrer-Policy: no-referrer` for `/order` and all nested order routes in Next response headers — gate: `pnpm lint` → passed; `pnpm typecheck` → passed; `openspec validate order-tracking --strict` → valid

## 2. Pages (Claude)

- [x] 2.1 `/order/[reference]` page: status pill, timeline, lines, totals, masked contact — gate: `pnpm lint` → passed; `pnpm typecheck` → passed
- [x] 2.2 Payment instructions panel with expiry countdown and the POP form; server errors are field-adjacent alerts and focus the field — gate: `pnpm lint` → passed; `pnpm typecheck` → passed
- [x] 2.3 Per-status copy including pickup pin, expired and flagged states, using `effectiveStatus` — gate: `pnpm lint` → passed; `pnpm typecheck` → passed
- [x] 2.4 `/order` find-my-booking page with generic response and persistent rate limiting — gate: `pnpm lint` → passed; `pnpm typecheck` → passed
- [x] 2.5 Component tests for each status copy, flagged state, POP field error/focus and live-region announcement — gate: `pnpm test app/order/order.dom.test.tsx app/order/status-message.dom.test.tsx` → 10 passed; `pnpm lint` → passed
- [x] 2.6 Change the booking confirmation Continue link from `/` to `/order/<reference>?t=<accessToken>`; update the booking-wizard spec delta and test the hand-off — gate: `pnpm test app/book/wizard.dom.test.tsx` → 11 passed; `openspec validate order-tracking --strict` → valid

## 3. Integration (Claude owns this check)

- [x] 3.1 Test: create an order, open the page with the token, submit POP, see `awaiting_verification`; wrong token shows the generic not-found — gate: `pnpm test app/order/page.integration.test.tsx` → 2 passed
- [x] 3.2 `pnpm lint`, `pnpm typecheck`, `pnpm test --maxWorkers=2`, `pnpm build`, and `NEXT_OUTPUT=standalone pnpm build` pass with `DATABASE_URL` and `DATABASE_MIGRATION_URL` unset; portability and OpenSpec validation pass — gate: lint → passed; typecheck → passed; test → 614 passed, 1 skipped; default build → passed; standalone build → passed; `pnpm check:portability` → passed; `openspec validate order-tracking --strict` → valid

## 4. Independent review fixes

- [x] 4.1 Serialize recovery sends on the order row and conditionally restore the previous token hash after an SMS failure; log without customer data — gate: `pnpm test lib/orders/access.test.ts` → 8 passed
- [x] 4.2 Schedule lookup, rotation and SMS after the response for every allowed request, with an injected scheduler in service tests — gate: `pnpm test lib/orders/access.test.ts` → 8 passed
- [x] 4.3 Refresh the order page after successful POP and announce the new state in its persistent live region — gate: `pnpm test app/order/actions.test.ts app/order/page.integration.test.tsx app/order/status-message.dom.test.tsx` → 16 passed
- [x] 4.4 Label the deposit amount without claiming verification and use `balanceDue` for settled balances — gate: `pnpm test app/order/page.integration.test.tsx` → 3 passed
- [x] 4.5 Skip the reference limiter when the client-address limit denies a lookup — gate: `pnpm test lib/orders/access.test.ts` → 8 passed
- [x] 4.6 Notify from the order returned by `submitPop` so concurrent token rotation cannot break a saved POP — gate: `pnpm test app/order/actions.test.ts` → 5 passed
- [x] 4.7 Render a stable countdown placeholder through hydration, then calculate immediately and every second — gate: `pnpm test app/order/countdown.dom.test.tsx` → 1 passed
- [x] 4.8 Show `Awaiting quote` in the shared status pill with the agreed gold-wash style; complete integration gates — gate: `pnpm test app/order/page.integration.test.tsx` → 3 passed; lint, typecheck, portability → passed; full test → 621 passed, 1 skipped; default and standalone build → passed; `openspec validate order-tracking --strict` → valid
