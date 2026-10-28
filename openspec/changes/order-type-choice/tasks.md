## 1. Server (backend)

- [x] 1.1 `lib/booking/schema.ts` and `lib/booking/create-booking.ts`: add `WEDDING_WITH_CAKE` (`_form`) and `QUOTE_NEEDS_CAKE` (`quoteDescription`) to `BOOKING_ERROR_CODES` and enforce them; tests for quote basket guards and plain cake — gate: `pnpm test lib/booking/create-booking.test.ts` → 20 passed
- [x] 1.2 `app/owner/(console)/orders/order-detail-sheet.tsx`: label the subtotal "Base price (price list)" for `awaiting_quote` orders that have priced lines; K0 wedding retains "Total" — gate: `pnpm test components/ui/OrderDetailSheet.test.tsx` → 8 passed

## 2. Wizard (frontend)

- [x] 2.1 `components/ui/Stepper.tsx`: hide the total and later mobile segments on step 1 ("Step 1 · Choose items") — gate: `pnpm test components/ui/Stepper.test.tsx` → 5 passed; dessert-only "Step 2 of 3" remains covered by unchanged dynamic steps
- [x] 2.2 Step 1: three choice cards (price-list cake / wedding cake mutually exclusive, desserts independent); remove the "Something custom?" checkbox; keep flavour/frosting pickers for the menu cake; one filled primary button — gate: `pnpm test app/book/wizard.dom.test.tsx` → 18 passed
- [x] 2.3 Cake details: "Customise this cake" toggle with request type (character cake, toppings, other), description and `ImageUploader`; turning it off clears the quote request — gate: `pnpm test app/book/wizard.dom.test.tsx` → 18 passed
- [x] 2.4 Wedding details step: description with helper prompts, `ImageUploader`, no price; submits a `wedding_cake` quote request with no cake — gate: `pnpm test app/book/wizard.dom.test.tsx` → 18 passed; legacy wedding submission shape covered
- [x] 2.5 Review and confirmation copy for the customised and wedding cases ("Base price (price list)", no deposit until the quote); wizard messages for the two new error codes — gates: `pnpm test app/book/wizard.dom.test.tsx` → 18 passed; `pnpm test components/ui/OrderDetailSheet.test.tsx` → 8 passed
- [x] 2.6 Draft restore: map old drafts as in design.md (wedding kind → wedding choice; other kinds without a cake → drop the quote request) — gate: `pnpm test app/book/wizard.dom.test.tsx` → 18 passed
- [x] 2.7 Update `app/book/wizard.dom.test.tsx` for the new step 1 and add tests for each booking-wizard scenario in this change's spec delta — gate: `pnpm test app/book/wizard.dom.test.tsx` → 18 passed

## 3. Verify

- [ ] 3.1 `pnpm lint`, `pnpm typecheck`, `pnpm test --maxWorkers=2`, `pnpm build`, `pnpm check:portability`, `openspec validate order-type-choice --strict` all pass
