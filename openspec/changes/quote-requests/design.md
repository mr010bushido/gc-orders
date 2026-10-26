## Context

`order-lifecycle` already has the `awaiting_quote` status and the `send_quote` (to `awaiting_payment`, with the payment clock starting then) and `decline` transitions. `basket-pricing` accepts owner quote lines with no rush or surcharge. `image-uploads` provides the attach tokens. The basket keeps priced items alongside a quote request, and the owner adds a priced quote line (Q22).

## Goals / Non-Goals

**Goals:**
- A request flows through the same order, reference, deposit and POP path as any booking.
- The customer never pays before they have seen a price.

**Non-Goals:**
- Chat, revisions of a sent quote, partial deposits, expiring unquoted requests.

## Decisions

- **Quote links rotate the order access token.** `sendQuote` stores only the new token hash and returns plaintext to the caller for the post-commit `quote_ready` notification; the previous request link stops working, and Find my booking can recover access if delivery fails.

- **Request details in `quote_requests(order_id, kind, description)`.** One row per order, created with the order. The description is plain text of 10 to 2,000 characters, and counts as personal data for retention.
- **Totals before a quote count only priced items.** A quote-only order has total 0 and deposit 0 until the quote is sent. The order page and notifications never show a deposit for an `awaiting_quote` order.
- **`sendQuote(orderId, lines, now)` does three things in one transaction:** append `quote` lines (label, amount), recompute total and deposit through `priceBasket` with the existing lines plus the quote lines, and perform the `send_quote` transition, which sets the payment deadline to `now` plus the expiry setting. Lines cannot be edited afterwards; a mistake means declining and asking the customer to rebook.
- **Why recompute with `priceBasket`.** One function owns rounding. Quote lines carry no rush or surcharge, which `basket-pricing` guarantees.
- **Event date rules.** Priced items follow their own rules. A quote-only basket needs a date from tomorrow. The owner sees the date and may decline if it cannot be met.
- **Decline is silent.** The owner contacts the customer directly (WhatsApp or call buttons exist). No message is sent, to avoid wording the owner has not chosen.
- **Pill.** `awaiting_quote` reuses the gold-wash tokens with the label "Awaiting quote". `components/StatusPill.tsx`, `design/components/StatusPill.tsx` and the status table in `design/DESIGN.md` are updated together.
- **Notification events.** `quote_request_received` (customer, SMS and email) is added to `notifications`; `owner_new_quote_request` and `quote_ready` already exist there.

## Risks / Trade-offs

- [Requests pile up unanswered] → They stay in the owner's default view and are highlighted as New until opened; no automatic expiry is invented.
- [Owner quotes the wrong amount] → The form previews total and deposit before sending; lines are immutable after sending, and decline plus rebook is the fix.
- [A quote link works without a deposit being due yet] → The order page shows payment instructions only in `awaiting_payment`.
- [Spam requests with photos] → The booking rate limit and the upload limits apply.
