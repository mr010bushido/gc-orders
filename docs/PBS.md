# Giuseppe's Cakes Orders: Product Breakdown Structure

Source: [`docs/prototype/cake-booking-prototype.html`](prototype/cake-booking-prototype.html), the clickable prototype that serves as the PRD.

The product is a mobile-first web app with two faces. Customers book and pay a deposit for a custom cake. The owner verifies payments and manages orders. Each item is tagged:

- **[P]**: in the prototype.
- **[I]**: implied by the prototype (copy, statuses or mock data refer to it) but not designed.
- **[G]**: a gap needed to make the product real; to be decided in grilling.

## 0. Giuseppe's Cakes Orders (whole product)

### 1. Customer booking flow
1.1 **Landing** [P]: logo, hero, "Book a cake" CTA, banner for bulk desserts/cupcakes (min. 30 per type, K30 each, handled in-store/WhatsApp).
1.2 **Step indicator** [P]: 4 steps (Flavour, Size & add-ons, Delivery & details, Review & pay); back links; sticky running-total bar.
1.3 **Step 1: Flavour** [P]: pick one flavour from 4 priced groups (Classic K1,300, Signature K1,400, Traditional Fruit K2,000, Vegan & Diabetic K1,700).
  - 1.3.1 Vegan/Diabetic sub-variants [I]: the prototype shows only one per group, with alternatives as "also available" text. They need to be selectable.
1.4 **Step 2: Size, tiers, add-ons** [P]: 1–3 tiers, 8"–16" each; add-ons: edible print K100, gloss print K75, message topper K100, chocolate drip included.
  - 1.4.1 Topper message text [G]: there is no field to capture the message.
  - 1.4.2 Print image upload [G]: edible/gloss print needs an image.
  - 1.4.3 Design notes / reference photo [G]: there is no way to describe the cake's look or choose a buttercream ("your choice of buttercream" in copy).
1.5 **Step 3: Fulfilment & details** [P]: delivery (K150, address) or pickup (free, Google Maps pin); event date; name; phone.
  - 1.5.1 Short-notice warning [P]: under 48h adds 20% of the cake price.
  - 1.5.2 Email field [G]: confirmation copy promises "SMS and email", but no email is collected.
  - 1.5.3 Delivery time / pickup time slot [G].
  - 1.5.4 Delivery zones / fee by distance [G]: flat K150 everywhere?
  - 1.5.5 Date blocking [I]: full or unavailable days (see 4.2).
1.6 **Step 4: Review & deposit** [P]: price summary, generate booking reference `CAKE-YYYY-NNNN`, 50% deposit, Airtel Money / MTN MoMo numbers with copy buttons.
1.7 **Step 5: Proof of payment (POP)** [P]: paste the mobile-money confirmation SMS.
  - 1.7.1 Screenshot upload as alternative [G].
1.8 **Step 6: Confirmation** [P]: status timeline (received, payment submitted, confirmed), pickup pin, "book another".
1.9 **Order status lookup** [G]: a customer returns later to check status or add POP (via reference + phone, or a link).
1.10 **Input validation and required fields** [G]: the prototype lets you continue with nothing selected.

### 2. Pricing & payments
2.1 **Pricing engine** [P], implemented in `src/gc_orders/pricing.py`: base × Σ size multipliers (8"=0.80, 10"=1.00, 12"=1.20, 14"=1.44, 16"=1.73) + 20% rush on cake + add-ons + delivery; deposit 50%.
2.2 **Booking reference generator** [P]: unique, sequential per year (the prototype uses random numbers, which can collide).
2.3 **Payment instructions** [P]: Airtel / MTN numbers; reference used to match payments.
2.4 **POP capture & storage** [P].
2.5 **POP auto-parsing** [G, optional]: extract amount and transaction ID from the pasted SMS and pre-check against the deposit.
2.6 **Balance payment** [I]: the remaining 50%. When is it paid, and is it tracked?
2.7 **Refunds / cancellation policy** [G].

### 3. Owner console
3.1 **Owner authentication** [G]: the prototype is an open toggle.
3.2 **Order list** [P]: cards with name, date, fulfilment, reference, total, status pill.
3.3 **Status filters** [P]: All, New, Awaiting POP, Awaiting Verification, Confirmed, Completed (Expired exists but has no filter chip).
3.4 **Order detail sheet** [P]: flavour, size, fulfilment, date, total, deposit, pasted POP.
3.5 **Verify & confirm** [P]: moves the order to Confirmed.
3.6 **Flag mismatch** [P, no behaviour]: what happens next (status, customer notified, re-submit POP)?
3.7 **Mark completed** [I]: Completed status exists, but nothing sets it.
3.8 **Expire unpaid orders** [I]: Expired status exists. Needs a timeout rule (e.g. no POP within N hours).
3.9 **Daily capacity indicator** [P]: "3 of 10 cakes booked". See 4.2.
3.10 **Calendar / production view** [G]: what to bake per day.
3.11 **Edit / cancel order, contact customer (call / WhatsApp link)** [G].
3.12 **Search by reference or name** [G].

### 4. Catalogue & business configuration
4.1 **Catalogue admin** [G]: flavours, groups, prices, sizes, multipliers, add-ons, fees. Currently hard-coded.
4.2 **Capacity rules** [I]: max cakes per day (10). Count by cake or by tier? Block the date when full?
4.3 **Business settings** [G]: payment numbers, pickup location, rush window and rate, deposit rate, lead time.

### 5. Order lifecycle (state machine)
5.1 **States** [P]: New, Awaiting POP, Awaiting Verification, Confirmed, Completed; Expired. Flagged [G] needs adding.
5.2 **Transitions & who triggers them** [I]: reference generated → New? "I've sent payment" → Awaiting POP? POP submitted → Awaiting Verification. The meaning of New vs Awaiting POP needs pinning down.
5.3 **Audit trail** [G]: who changed what and when.

### 6. Notifications
6.1 **SMS to customer on confirmation** [I] (copy promises it).
6.2 **Email to customer** [I] (needs 1.5.2).
6.3 **Owner alert on new POP** [G].
6.4 **Event reminder** [G, optional].
6.5 **Provider** [G]: SMS gateway for Zambia, WhatsApp Business, or email-only first?

### 7. Brand & design system
7.1 **Tokens** [P]: colours (cream, paper, ink, brand red #9E2B2E, sage, gold, status tints), radius 14px, shadow.
7.2 **Typography** [P]: Alex Brush (wordmark), Cormorant Garamond italic (headings), Inter (UI).
7.3 **Components** [P]: buttons, option rows, radio cards, fields, banners, stepper, summary card, ref box, pay option, timeline, chips, pills, order card, bottom sheet, sticky bar.
7.4 **Assets** [P]: logo (embedded in prototype), botanical sprig SVG, app icon.
7.5 **Design system doc** [pending]: to be supplied by the owner.
7.6 **Accessibility** [G]: option rows are clickable divs; focus states, contrast, labels.

### 8. Platform & delivery
8.1 **Project tooling** [done]: uv, Python 3.13, ruff, pytest.
8.2 **CI** [done]: GitHub Actions (lint, format check, tests) on PRs and `main`.
8.3 **Web framework & rendering** [G]: server-rendered vs SPA.
8.4 **Database & data model** [G]: Order, OrderTier, Customer, Payment/POP, CatalogueItem, Settings.
8.5 **File storage** [G]: print images, POP screenshots (if 1.4.2 / 1.7.1).
8.6 **Hosting, domain, TLS, backups** [G].
8.7 **Environments & secrets** [G]: dev / prod, `.env`.
8.8 **Data protection** [G]: customer phone/address, retention (Zambia Data Protection Act 2021).
8.9 **Analytics** [G, optional].

## Open questions for grilling

| # | Question | PBS ref |
|---|----------|---------|
| 1 | Mock totals don't match the pricing rules: Black Forest 12" delivery shows K1,860 (rules give K1,830), Vanilla Caramel 8"+10" pickup shows K2,660 (rules give K2,520). Which is right? | 2.1 |
| 2 | Kwacha rounding: whole Kwacha half-up (current), or ngwee? | 2.1 |
| 3 | Does the rush window count from now to the start of the event day (current), or to a delivery time? | 1.5.1 |
| 4 | Do multi-tier cakes have one flavour or one per tier? | 1.4 |
| 5 | What do New and Awaiting POP mean exactly, and when does an order expire? | 5.2, 3.8 |
| 6 | What happens after Flag mismatch? | 3.6 |
| 7 | Capacity: 10 cakes or 10 tiers per day, and does a full day block booking? | 4.2 |
| 8 | Notifications: SMS provider, email, WhatsApp? Which ones are in v1? | 6 |
| 9 | Does the owner need to edit prices without a deploy? | 4.1 |
| 10 | Framework / hosting preferences? | 8.3–8.6 |
| 11 | Balance payment and cancellation/refund policy? | 2.6, 2.7 |
