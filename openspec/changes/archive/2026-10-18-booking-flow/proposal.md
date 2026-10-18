## Why

Customers cannot book yet. This change delivers the customer journey from the landing page to the booking reference and payment instructions: the wizard, the server action that validates and creates the order, and the validation rules (PBS 1.1 to 1.11, 1.15, Q4, Q15, Q17, Q24, Q31).

## What Changes

- Landing page "Book a Cake" and a wizard at `/book` with a stepper: Choose items, Cake details, Delivery and details, Review. The cake step is skipped when the basket has desserts only, and the stepper then shows three steps.
- Step 1: pick cake and/or desserts. A cake needs one flavour and one frosting. A dessert line needs a type and a quantity of at least 30, with an optional flavour note.
- Step 2 (cake): size and tiers (up to the max tiers setting), design notes, a message-topper text when that add-on is chosen, add-ons.
- Step 3: pickup or delivery (address required), event date from the date picker (closed dates blocked, rush days marked, earliest date from the basket), time window (morning, afternoon, evening), name, Zambian phone, email.
- Review: summary card with the rush fee, delivery, dessert surcharge, total and 50% deposit. A privacy note sits above the submit button.
- `createBooking` server action: validates everything on the server, re-prices, re-checks the date, creates the order and returns the reference. Response page shows the reference and the payment instructions (Airtel and MTN numbers, the 50% deposit, quote the reference).
- Wizard state survives step navigation and a page refresh within the session.

- After the order commits, `createBooking` sends the customer "booking received" and the owner "new booking" messages through `notify`. A send failure never fails the booking.

Out of scope: image upload (`image-uploads` adds it to step 2), the quote-request path (`quote-requests`), the order status page and POP entry (`order-tracking`).

## Capabilities

### New Capabilities
- `booking-submission`: the `createBooking` contract: input shape, validation errors, response shape and the server-side rules.
- `booking-wizard`: the customer screens, steps, behaviour and accessibility.

### Modified Capabilities
None.

## Impact

- New: `app/page.tsx` (landing), `app/book/*`, `lib/booking/*` (schema, action), tests.
- Cross-cutting: Codex owns `lib/booking/*` and the action; Claude owns the screens. One named agent (Claude) owns the final integration check, an end-to-end test of the wizard against the action.
- Depends on `design-system-components`, `order-lifecycle`, `date-availability`, `notifications` (and so `catalogue-pricing-config`, `basket-pricing`, `database-foundation`).
- Linear issue: created when the implementer is delegated.
