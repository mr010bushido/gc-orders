## 1. Domain (Codex)

- [x] 1.1 Schema and migration for `quote_requests` (RLS on); extend the booking schema with `quoteRequest`; booking validation and order creation for quote-only and mixed baskets; tests for the scenarios — gate: `pnpm db:generate`, `pnpm test lib/booking/create-booking.test.ts` → 18 passed, `pnpm typecheck` → passed
- [x] 1.2 `sendQuote(orderId, lines, now)`: validate, append lines, recompute via `priceBasket`, `send_quote` transition and deadline in one transaction; tests including double send and priced-item-plus-quote — gate: `pnpm test lib/quotes/quotes.test.ts` → 3 passed, `pnpm typecheck` → passed
- [x] 1.3 `declineQuote` using the `decline` transition; test that no notification is sent — gate: `pnpm test lib/quotes/quotes.test.ts` → 3 passed (silent decline), `pnpm typecheck` → passed
- [x] 1.4 Add `quote_request_received` to `notifications` (template, recipients, tests); call `notify` for request received, owner alert and quote ready, with provider-failure tests. Decision: `sendQuote` rotates the order token, returns plaintext only to the caller for post-commit notification, and stores only its hash; the old link stops working and Find my booking recovers access if delivery fails — gate: `pnpm test lib/quotes/quotes.test.ts lib/notify/notify.test.ts lib/notify/templates.test.ts app/book/actions.test.ts` → 51 passed, `pnpm typecheck` → passed, `openspec validate quote-requests --strict` → valid
- [x] 1.5 Owner server actions `sendQuoteAction` and `declineQuoteAction` with `requireOwner()` and tests — gate: `pnpm test app/owner/owner.integration.test.tsx` → 7 passed, `pnpm typecheck` → passed

## 2. Screens (Claude)

- [x] 2.1 Deviation: both status pill components already include `awaiting_quote`, so updated only the missing status table in `design/DESIGN.md` — gate: `openspec validate quote-requests --strict` → valid; rechecked `pnpm lint` → passed (2 existing warnings), `pnpm typecheck` → passed
- [x] 2.2 Wizard quote request kind, description and `ImageUploader`; quote-only review and submission avoid showing a deposit — gate: `pnpm test app/book/wizard.dom.test.tsx` → 14 passed; rechecked `pnpm lint` → passed (2 existing warnings), `pnpm typecheck` → passed
- [x] 2.3 Owner sheet shows request details/photos, prices through `priceBasket`, previews total and deposit, and exposes Send quote and Decline — gate: `pnpm test components/ui/OrderDetailSheet.test.tsx` → 5 passed, `pnpm test app/owner/owner.integration.test.tsx` → 7 passed; rechecked `pnpm lint` → passed (2 existing warnings), `pnpm typecheck` → passed
- [x] 2.4 Order page shows quote request details and `awaiting_quote` copy without payment instructions or amounts; after sending, shows quote lines, total, deposit and payment instructions — gate: `pnpm test app/order/page.integration.test.tsx` → 11 passed, `pnpm typecheck` → passed
- [x] 2.5 Component and page tests cover the wizard, owner quote sheet, status message and order page additions — gate: `pnpm test app/book/wizard.dom.test.tsx` → 14 passed, `pnpm test components/ui/OrderDetailSheet.test.tsx` → 5 passed, `pnpm test app/order/status-message.dom.test.tsx` → 10 passed, `pnpm test app/order/page.integration.test.tsx` → 11 passed

## 3. Integration (Claude owns this check)

- [ ] 3.1 Test: submit a quote-only request, price it as the owner, open the customer link, see the deposit and submit POP, then verify
- [ ] 3.2 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass; `openspec validate quote-requests --strict` passes
