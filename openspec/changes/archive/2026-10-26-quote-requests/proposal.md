## Why

Wedding cakes, character cakes and toppings that "vary" cannot be priced by formula (PRD Appendix A; PBS 1.5.3, Q14, Q21, Q22, D2). Rather than hide them, the app takes a request with details and photos, the owner prices it, and the customer pays the usual 50% deposit through the same order flow.

## What Changes

- The booking wizard offers "Something custom? Request a quote": a kind (character cake, wedding cake, toppings, other), a description, and up to 3 photos. It can be combined with priced items in the same basket, or stand alone.
- Submitting creates an order in `awaiting_quote` with a reference. The customer gets "request received" by SMS and email with their order link, and the owner gets an alert by SMS and email (D1).
- The owner sheet shows the request and photos and a "Price this request" form: one or more priced lines (label and whole-Kwacha amount) with a live total and deposit. "Send quote" adds the lines, recomputes total and deposit, moves the order to `awaiting_payment` and starts the 24-hour payment clock (Q21).
- The customer receives "quote ready" by SMS and email with a link to the order page, which shows the quote lines, the new deposit and the usual payment instructions and POP form (D2).
- The owner can decline a request, which ends it as `expired` without a message.
- Add the `awaiting_quote` status pill (gold-wash style) to the shared component and the design document.

Out of scope: negotiation or counter-offers in the app, automatic pricing of these items, quote expiry before a quote is sent.

## Capabilities

### New Capabilities
- `quote-requests`: submission, pricing and sending of quotes, decline, status and notifications.

### Modified Capabilities
None.

## Impact

- New: `quote_requests` table and migration, `lib/quotes/*`, wizard additions, owner sheet form, order page copy, `awaiting_quote` pill, two notification events.
- Cross-cutting: Codex owns the domain functions and actions; Claude owns the wizard section, the sheet form and the pill; Claude owns the integration check.
- Depends on `booking-flow`, `notifications`, `owner-orders`, `image-uploads`, `order-tracking`.
- Linear issue: created when the implementer is delegated.
