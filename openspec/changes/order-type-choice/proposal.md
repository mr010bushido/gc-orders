## Why

Phone testing on 2026-10-28 (JMS-203, JMS-204 part a, JMS-208, JMS-210) showed that step 1 of the booking wizard is confusing:

- A checkbox, a boxed checkbox and a text link all start an order, with no clear hierarchy.
- A customer can tick a price-list cake and "Something custom? Request a quote" together, by accident. The owner then sees an order that is both priced and awaiting a quote.
- Wedding cakes, an important cultural occasion priced separately (PRD Appendix A), are hidden inside a "custom" dropdown.
- The stepper says "Step 1 of 3" and then "Step 2 of 4" once a cake is chosen.

The user decided on 2026-10-28 (recorded on JMS-203):

1. Step 1 offers three choices: **Cake from our price list**, **Wedding cake** and **Desserts**. The free-standing "Something custom?" option goes away.
2. A wedding cake is **quote only**: no price is shown, and the owner prices it.
3. A price-list cake can be **customised** from a toggle on the Cake details step. It keeps its list price as a base, and the owner adds quote lines for the custom work.
4. Desserts can be added to either cake choice or ordered on their own.
5. Step 1 shows no step total; the total appears once the basket fixes it.

## What Changes

- Step 1 becomes three large choice cards: a price-list cake and a wedding cake are mutually exclusive, and Desserts can combine with either. **BREAKING (UI):** the "Something custom? Request a quote" checkbox is removed.
- The Cake details step gains a "Customise this cake" toggle that reveals the request type (character cake, toppings, other), a description and up to 3 reference photos.
- A new Wedding details step replaces Cake details for wedding orders: a description (with prompts for guest count, tiers and theme) and up to 3 reference photos.
- The stepper hides the total on step 1.
- The server enforces the basket rules: a `wedding_cake` quote request cannot be sent with a priced cake, and any other quote kind requires a priced cake. A plain price-list order never becomes `awaiting_quote`.
- The wizard review and the owner sheet label the cake line as the base price on customised orders ("Base price (price list)" instead of "Priced items so far").

## Capabilities

### Modified Capabilities

- `booking-wizard`: step 1 choices, stepper, customise toggle, wedding details step.
- `quote-requests`: submission rules tie each quote kind to the basket shape.

## Impact

- `app/book/wizard.tsx` (and its DOM tests), `components/ui/Stepper.tsx`.
- `lib/booking/schema.ts` / `lib/booking/create-booking.ts`: two new validation errors; no schema migration (quote kinds unchanged).
- `app/owner/(console)/orders/order-detail-sheet.tsx`: a label change.
- Existing orders are unaffected. The rules apply to new submissions only.

Out of scope: JMS-205 (size helper text), JMS-206 (location) and JMS-207 (notification visibility), which are separate changes.
