## 1. Domain (Codex)

- [x] 1.1 Schema and migration for `quote_requests` (RLS on); extend the booking schema with `quoteRequest`; booking validation and order creation for quote-only and mixed baskets; tests for the scenarios — gate: `pnpm db:generate`, `pnpm test lib/booking/create-booking.test.ts` → 18 passed, `pnpm typecheck` → passed
- [x] 1.2 `sendQuote(orderId, lines, now)`: validate, append lines, recompute via `priceBasket`, `send_quote` transition and deadline in one transaction; tests including double send and priced-item-plus-quote — gate: `pnpm test lib/quotes/quotes.test.ts` → 3 passed, `pnpm typecheck` → passed
- [x] 1.3 `declineQuote` using the `decline` transition; test that no notification is sent — gate: `pnpm test lib/quotes/quotes.test.ts` → 3 passed (silent decline), `pnpm typecheck` → passed
- [ ] 1.4 Add `quote_request_received` to `notifications` (template, recipients, tests); call `notify` for request received, owner alert and quote ready, with provider-failure tests
- [ ] 1.5 Owner server actions `sendQuoteAction` and `declineQuoteAction` with `requireOwner()` and tests

## 2. Screens (Claude)

- [ ] 2.1 Add `awaiting_quote` to `components/StatusPill.tsx`, `design/components/StatusPill.tsx` and the status table in `design/DESIGN.md`; update the gallery and tests
- [ ] 2.2 Wizard: "Something custom? Request a quote" section (kind, description, `ImageUploader`) in step 1 and the matching review copy for quote-only baskets
- [ ] 2.3 Owner sheet: request details and photos, "Price this request" form with live total and deposit, Send quote and Decline
- [ ] 2.4 Order page: `awaiting_quote` copy without payment instructions, quote lines after sending
- [ ] 2.5 Component tests for each addition

## 3. Integration (Claude owns this check)

- [ ] 3.1 Test: submit a quote-only request, price it as the owner, open the customer link, see the deposit and submit POP, then verify
- [ ] 3.2 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass; `openspec validate quote-requests --strict` passes
