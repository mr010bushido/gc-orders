## Context

`lib/pricing.ts` exports `quote(input, now)`: integer-hundredths maths, Lusaka as a fixed UTC+2 offset, and a 48-hour cake rush. Its prices are module constants until `catalogue-pricing-config`. The basket must work with those constants now and with catalogue data later.

## Goals / Non-Goals

**Goals:**
- One pure function that prices any valid basket and explains every line of the total.
- Rules expressed so that swapping constants for catalogue values later changes arguments, not logic.

**Non-Goals:**
- Persistence, owner editing of rates, rendering. Quote lines are accepted as input; creating them is `quote-requests`.

## Decisions

- **Compose, don't rewrite.** The cake part calls `quote()` with a no-delivery input, then `priceBasket` adds delivery once. The cake rush and cake validation stay in one place. `quote()` returning `lines` is the only change to it.
- **Rates and limits are parameters with defaults.** `priceBasket(input, now, rules = DEFAULT_RULES)` where `DEFAULT_RULES` holds dessert unit price 30, minimum quantity 30, lead time 5 days, surcharge 20%, delivery 150. `catalogue-pricing-config` will pass values from the database.
- **Lead time is a duration to local midnight.** `eventMidnightLusaka - now >= 5 * 24h`. This matches how the 48-hour rush is measured (PBS Q24) and avoids counting calendar days, which would disagree across the day boundary.
- **Flavour mix is a note.** A dessert line is `{ type, quantity, note? }`. The quantity is the only priced field. Splitting 30 cupcakes into flavours is the customer's free-text note, which the owner reads.
- **Errors carry a code.** `PricingError extends RangeError` with `code` in `EMPTY_BASKET`, `INVALID_CAKE`, `UNKNOWN_DESSERT`, `DESSERT_MIN_QUANTITY`, `DESSERT_LEAD_TIME`, `INVALID_QUOTE_LINE`, `INVALID_DATE`. Server actions map codes to user messages without parsing strings. Messages from `quote()` are wrapped as `INVALID_CAKE`.
- **Surcharge on the unrounded subtotal.** Dessert subtotal is an integer; the surcharge is computed in hundredths and rounded half-up like every other amount. The deposit uses the unrounded total, as in `cake-pricing`.

## Risks / Trade-offs

- [Earliest date helper and server validation could disagree] → Both call the same functions; the booking server action revalidates with `priceBasket` and never trusts the client's date check.
- [Surcharge rate becomes owner-editable] → Already a parameter; rounding is covered by a test with a fractional rate.
- [`quote()` and basket both validate the date] → Intentional duplication is avoided: `priceBasket` validates dessert-only dates itself and relies on `quote()` when a cake is present.
