## Context

The prototype has four steps (Flavour, Size and add-ons, Delivery and details, Review and pay) and then POP and confirmation screens. The agreed model is a basket of cake and/or desserts (Q17), so the first step changes. The design system gives the stepper, radio card, add-on list, date picker and summary card.

## Goals / Non-Goals

**Goals:**
- A fast mobile booking on a flaky connection: server-rendered form, no required client JavaScript beyond the wizard state.
- The server is the only authority on price, date availability and validation.

**Non-Goals:**
- Accounts, saved addresses, payment capture, uploads, quotes.

## Decisions

- **Contract first.** `lib/booking/schema.ts` defines the request as a zod schema shared by form and action; the action returns `{ ok: true, reference, accessToken?, ... }` or `{ ok: false, errors: { field → code } }`. Codes (`REQUIRED`, `PHONE_INVALID`, `EMAIL_INVALID`, `DATE_UNAVAILABLE`, `DATE_TOO_SOON`, `DESSERT_MIN_QUANTITY`, `DELIVERY_ADDRESS_REQUIRED`, `TOO_MANY_TIERS`, `INACTIVE_ITEM`, …) map to messages in the UI. Both agents work from this file.
- **Client sends choices, never prices.** The action loads the catalogue, validates the selections, calls `priceBasket` and stores the result. The review screen shows a price computed by the same function from the same catalogue snapshot, passed to the page by a server component.
- **Wizard state in the URL-independent client store plus `sessionStorage`.** Steps are one route, `/book`, with the step in the query (`?step=2`), so Back works and each step is linkable but state is not. State is cleared after a successful submit. Alternative considered: one route per step with server-held draft state; rejected, because it needs a draft table.
- **Date logic is shared.** The picker gets `minDate = earliestEventDate(hasCake, now)`, `isRush = isCakeRushDate`, and `closedDates` from `date-availability`. The action re-runs the same checks.
- **Spam protection.** Reject a filled hidden honeypot field. On 2026-10-18 the user removed the proposed per-IP submission limit. The capacity setting of 10 confirmed orders for an event date is separate and still prompts the owner to close the date or keep it open.
- **Success page after redirect.** The action redirects to `/book/done/[reference]?t=<token>`; the page needs the token to display the details, so the reference alone leaks nothing. The final lookup is done by `order-tracking`'s token resolver; until that merges the page receives the data through the action result.
- **Payment instructions come from settings**, not constants, so the owner can change the numbers.
- **Privacy note** is plain text near submit, stating what is kept and for how long (images 90 days after the event, orders anonymised after 2 years).

## Risks / Trade-offs

- [Price shown differs from price stored] → Only one function prices; an integration test compares the review total with the stored total.
- [A customer loses state on refresh] → `sessionStorage` restore, tested.
- [Two agents editing one flow] → Contract in `schema.ts` is merged first; Claude's screens import only its types.
- [Automated booking spam] → The honeypot rejects simple bots, but this change has no application-level booking rate limit. The user accepted this trade-off on 2026-10-18.
