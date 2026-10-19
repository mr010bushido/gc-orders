## Why

After booking, the customer must return to pay: paste the mobile money confirmation SMS as proof of payment (POP) and later see the confirmation. There are no customer accounts, so the way back in is a private link or the reference plus phone (PBS Q5). This is the customer's half of the order lifecycle.

## What Changes

- Order page at `/order/[reference]` opened with a private token link (`?t=…`); the link is in the booking SMS and email.
- "Find my booking" at `/order` taking the reference and phone number, rate limited, giving the same message whether or not an order matches.
- The page shows the status pill, a timeline of status events, the lines and totals, payment instructions while awaiting payment, and the pickup map pin for confirmed pickup orders.
- POP form (paste the SMS text) while the order is awaiting payment, or flagged: calls `submitPop`.
- Expired, awaiting verification and confirmed states each have clear copy; the page uses `effectiveStatus`.

POP submission also sends the customer's "POP received" message and the owner's "POP submitted" alert through `notify`.

Out of scope: the owner side and quote acceptance pages (`quote-requests`).

## Capabilities

### New Capabilities
- `order-tracking`: customer access to an order, the find-my-booking flow, the order page and POP submission.

### Modified Capabilities
None.

## Impact

- New: `app/order/*`, `lib/orders/access.ts`, tests.
- Cross-cutting: Codex owns access, lookup, rate limiting and the POP action; Claude owns the page. Claude owns the integration check.
- Depends on `order-lifecycle`, `design-system-components`, `notifications`, `booking-flow` (for the confirmation hand-off).
- Linear issue: created when the implementer is delegated.
