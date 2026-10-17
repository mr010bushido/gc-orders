## 1. Access and lookup (Codex)

- [ ] 1.1 `lib/orders/access.ts`: token verification, masking helpers, not-found equivalence; tests
- [ ] 1.2 `findMyBooking(reference, phone)` using `normaliseZambianMobile`, the rate limiter and the SMS sender from `notifications`; tests for match, mismatch, different phone formats and limits
- [ ] 1.3 `submitPopAction(token, text)` calling `submitPop` and then `notify('pop_received')` and `notify('owner_pop_submitted')`; tests for expired, flagged, too-short text and a provider failure
- [ ] 1.4 Route handlers/headers: `no-store`, `no-referrer`

## 2. Pages (Claude)

- [ ] 2.1 `/order/[reference]` page: status pill, timeline, lines, totals, masked contact
- [ ] 2.2 Payment instructions panel with expiry countdown and the POP form
- [ ] 2.3 Per-status copy including pickup pin, expired and flagged states
- [ ] 2.4 `/order` find-my-booking page
- [ ] 2.5 Component tests for each state and the live-region announcement

## 3. Integration (Claude owns this check)

- [ ] 3.1 Test: create an order, open the page with the token, submit POP, see `awaiting_verification`; wrong token shows the generic not-found
- [ ] 3.2 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass; `openspec validate order-tracking --strict` passes
