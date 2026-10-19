## Context

Customers have no accounts. The token (32 random bytes, hash stored) is the credential. The reference is guessable (sequential), so the reference alone must reveal nothing.

## Goals / Non-Goals

**Goals:**
- Anyone with the link sees the order; nobody without it can enumerate orders.
- Lookup by reference and phone works for a customer who lost the link, and returns a fresh link by SMS rather than showing data.

**Non-Goals:**
- Editing or cancelling an order, uploading anything, customer history (Phase 3).

## Decisions

- **Token in the query string, not a cookie.** A link works across devices and from SMS apps. `Referrer-Policy: no-referrer` and `Cache-Control: no-store` on the order routes keep it from leaking. Alternative considered: exchange the token for a cookie on first visit; it adds state for little gain on a low-risk page.
- **Find-my-booking sends a new link, it does not display data.** A match sends the order link to the stored phone by SMS and always answers "If that booking exists, we've sent a link". This blocks reference-and-phone guessing from revealing whether an order exists. The send uses the `notifications` SMS interface.
- **Rate limiting.** Five lookups per client address per hour and three per reference per hour, using the `RateLimiter` from `database-foundation`.
- **POP validation is light.** Length and non-empty only; the owner is the verifier. The page does not try to parse the SMS.
- **The page renders `effectiveStatus`.** A just-expired order shows as expired even if the job has not run, and POP is refused.
- **One server action per user action**, each taking the token, never an order id from the client.

## Risks / Trade-offs

- [Token leaks via a forwarded link] → The page shows only the first name, items, totals and status; phone and email are masked and the address is hidden, so a leaked link exposes little.
- [SMS cost of lookups] → The rate limits cap it; the owner can see the notification log.
- [Customer pastes the wrong text] → The owner flags it; the page then allows resubmission.
