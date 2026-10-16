# Giuseppe's Cakes Orders: Product Breakdown Structure

Sources, in order of precedence:

1. [`docs/PRD.md`](PRD.md): scope and business rules.
2. [`design/DESIGN.md`](../design/DESIGN.md): design system v1.1, which governs all visuals.
3. [`docs/prototype/`](prototype/cake-booking-prototype.html): flow reference only. Its styling is superseded by the design system.

The product is a mobile-first web app. Customers book a custom cake and pay a 50% mobile-money deposit offline. The owner verifies the proof of payment (POP) and manages orders.

Tags: **[PRD]** specified in the PRD · **[DS]** specified in the design system · **[Proto]** only in the prototype · **[Gap]** needed but unspecified · **[Conflict]** sources disagree. Each grilling question below is numbered **Q**.

## 0. Giuseppe's Cakes Orders (v1 = PRD Phase 1)

### 1. Customer booking flow
1.1 **Landing** [PRD]: "Book a Cake" CTA, logo, hero.
1.2 **Stepper** [DS]: "Step 2 of 4 · Details" over 4 segments on phones; numbered circles from tablet up.
1.3 **Flavour** [PRD]: 13 flavours in 3 price tiers (K1,300 / K1,400 / K2,000) and special diets (vegan ×3, diabetic ×3, K1,700).
  - 1.3.1 Frosting choice [PRD]: American buttercream, Swiss Meringue buttercream or Fino Whip. No charge.
  - 1.3.2 One flavour per cake or per tier? [Conflict]: the PRD says "Flavor(s), dropdown or multi-select"; the prototype says one. **Q4**
1.4 **Size & tiers** [PRD]: 8"–16" per tier; multi-tier sums the multipliers (App. B).
  - 1.4.1 Max tiers [Proto]: 3. **Q12**
  - 1.4.2 "Cake size/servings" [PRD]: show servings per size? Needs a servings table. **Q13**
1.5 **Design & add-ons** [PRD]: edible print K100, gloss print K75, message topper K100, chocolate drip included.
  - 1.5.1 Design notes + reference image upload [PRD].
  - 1.5.2 Topper message text field [Gap].
  - 1.5.3 Toppings / fruit toppings "varies", character cakes (K1,300 min), wedding cakes [PRD]: out of scope for price automation in v1. Hide them, or allow "request a quote"? **Q14**
1.6 **Fulfilment** [PRD]: delivery at a flat K150 with an address, or pickup with the Google Maps pin.
  - 1.6.1 Delivery/pickup time of day [Gap]. **Q15**
1.7 **Event date picker** [PRD + DS]: blocks fully booked dates; past days greyed; month name in Cormorant.
  - 1.7.1 Rush marking [Conflict]: the PRD says a 20% surcharge under **48h**; the DS date picker marks rush days at **less than 5 days**. **Q3**
1.8 **Contact details** [PRD]: name, phone, email.
1.9 **Review & submit** [PRD + DS]: summary card (rush fee in warn-ink, total in Cormorant 34px on gold-wash, deposit below).
1.10 **Booking reference** [PRD]: `CAKE-2026-0042`, generated on submit, unique and sequential. Shown on screen and sent by SMS + email.
1.11 **Payment instructions** [PRD]: Airtel +260 77 659 7882, MTN +260 96 622 2440, 50% deposit, quote the reference.
1.12 **Order status page** [PRD]: the customer "returns to the booking" to paste POP and later sees the confirmation. It needs a way back in (a link in the SMS/email, or reference + phone). **Q5**
1.13 **POP submission** [PRD]: paste the Airtel/MTN confirmation SMS text, with no upload. The order moves to Awaiting Verification.
1.14 **Confirmation** [PRD]: status timeline, plus the pickup pin if relevant.
1.15 **Validation** [Gap]: required fields, phone format (Zambian MSISDN), email format.
1.16 **Desserts** [Conflict]: the PRD pricing line includes "desserts if ordered separately" (K30 each, min 30 per type); the prototype sends them to in-store/WhatsApp. **Q6**

### 2. Pricing & payments
2.1 **Pricing engine** [PRD]: base × Σ tier multipliers + 20% rush on cake only + add-ons + delivery; deposit 50%. Implemented in `src/gc_orders/pricing.py`.
2.2 **Editable pricing config** [PRD]: the owner edits multipliers (and, by extension, prices and fees) without a developer. Today they are hard-coded.
2.3 **Rush rule anchor** [Conflict]: the PRD measures 48h from *order confirmation*, but confirmation happens after POP verification, so the price can't be known at booking. Proposed: measure from submission, then re-check at verification. **Q3**
2.4 **Rounding** [Gap]: whole Kwacha, half-up (current). **Q2**
2.5 **Balance (second 50%)** [Gap]: when and how it is paid, and whether it is tracked. **Q11**
2.6 **Cancellation / refunds** [Gap]. **Q11**
2.7 "Stripe transaction fees" in PRD §5 contradicts offline payment in §7–8. Treated as a typo: **no payment gateway**.

### 3. Owner dashboard
3.1 **Owner login** [PRD]: password or magic link, owner only.
3.2 **Order list** [PRD + DS]: order cards (ID + date, pill / customer + cake / fulfilment + total), sortable by event date.
3.3 **Status filters** [Proto]: one chip per status.
3.4 **Order detail** [PRD + DS]: bottom sheet on mobile, right panel on desktop; full details plus the pasted POP text.
3.5 **Verify** [PRD]: one click moves the order to Confirmed (Deposit Verified) and triggers notifications.
3.6 **Flag** [PRD]: on a mismatch the order stays pending (not rejected or expired) until resolved with the customer. Needs a flag marker plus an owner note. Is a flagged order exempt from 24h expiry? **Q7**
3.7 **Mark completed** [PRD status]: manual action.
3.8 **Capacity suggestions** [PRD]: suggest "at capacity" at **10 confirmed orders** per date; the owner confirms or overrides before the date closes.
3.9 **Manual date blocking** [Gap]: holidays, days off. **Q8**
3.10 **Contact customer** [Gap]: tap-to-call / WhatsApp link from the order.
3.11 **Pricing settings screen** [PRD]: see 2.2.
3.12 **Owner screens use Inter only** [DS].

### 4. Order lifecycle
4.1 **States** [PRD]: New → Awaiting POP → Awaiting Verification → Confirmed → Completed; Expired.
  - Naming [Conflict]: the DS calls the second state "Awaiting payment" (`awaiting_payment`); the PRD calls it "Awaiting POP". **Q9**
  - What separates New from Awaiting POP, if submission already issues the reference? **Q9**
4.2 **Auto-expiry** [PRD]: no POP within 24h of booking → Expired, and the date's capacity is freed. Needs a scheduled job.
4.3 **Flag** [PRD]: an attribute on the order, not a state (see 3.6).
4.4 **Audit trail** [Gap]: who changed status and when (light: a timestamp per transition).

### 5. Notifications
5.1 **SMS via Twilio** [PRD] (Zambia, outbound only, ~$0.30–0.43/msg). Credentials come from the owner.
5.2 **Email via Resend or Postmark** [PRD].
5.3 **Customer messages** [PRD]: booking received + reference; POP received; verified/confirmed (+ pickup pin).
5.4 **Owner messages** [PRD]: new booking; POP submitted.
5.5 **Expiry notice to customer** [Gap]. **Q10**
5.6 **Provider swap** [PRD]: local aggregator / MTN / Airtel bulk SMS later. Keep the SMS sender behind one function.

### 6. Design system implementation
6.1 **Tokens** [DS]: `design/tokens.css` (light + dark), the Tailwind v4 theme and DTCG JSON. No hard-coded hex.
6.2 **Fonts** [DS]: Cormorant Garamond (one moment per screen) + Inter. The prototype's Alex Brush is dropped; the logo PNG carries the script.
6.3 **Dark mode** [DS]: ThemeToggle, a no-flash head script, warm cocoa ground.
6.4 **Components** [DS]: primary/ghost button, input, radio card, add-on list, date picker, stepper, summary card, status pill, banners, order card, bottom sheet / side panel.
6.5 **Accessibility** [DS]: touch targets ≥44px, inputs 48px/16px text, real radios/checkboxes, 4.5:1 contrast, focus ring, `role="alert"` on the rush banner.

### 7. Platform
7.1 **Stack** [Conflict]: the PRD and DS specify **Next.js on Vercel** (the DS ships TSX + Tailwind v4); the repo was initialised with **uv/Python**. **Q1, blocks everything below.**
7.2 **Database** [PRD]: Vercel Postgres or Supabase free tier. Tables: orders, order_tiers, order_addons, pricing config, blocked dates, notifications log.
7.3 **File storage** [PRD]: Vercel Blob or Supabase Storage, for design reference images only.
7.4 **Auth** [PRD]: NextAuth (or equivalent) for the owner only.
7.5 **Scheduled job** [Gap]: 24h expiry (Vercel Cron, Supabase pg_cron, or a lazy check on read).
7.6 **CI/CD** [PRD]: Vercel Git integration (preview per PR, prod on merge to `main`) plus the GitHub Actions lint/test that exists today.
7.7 **Secrets** [PRD]: Twilio, Resend, DB URL in Vercel env, split by Preview/Production.
7.8 **Domain** [PRD]: ~$12/yr. Which name? **Q16**
7.9 **Data protection** [Gap]: customer phone/email/address retention (Zambia Data Protection Act 2021).

### Later phases (not v1)
- Phase 2 [PRD]: reporting on upcoming orders this week/month.
- Phase 3 [PRD]: customer order history, automated pricing for "varies" items and wedding cakes.

## Grilling queue

| # | Question | Ref |
|---|----------|-----|
| Q1 | Stack: Next.js on Vercel (per PRD + DS) or Python (uv)? | 7.1 |
| Q2 | Rounding: whole Kwacha half-up? | 2.4 |
| Q3 | Rush: 48h or 5 days? Measured from submission or confirmation? | 1.7.1, 2.3 |
| Q4 | One flavour per cake or per tier? | 1.3.2 |
| Q5 | How does the customer get back to their booking to paste POP? | 1.12 |
| Q6 | Desserts: bookable in the app in v1, or in-store/WhatsApp only? | 1.16 |
| Q7 | Flagged orders: exempt from 24h expiry? | 3.6 |
| Q8 | Manual date blocking (days off)? | 3.9 |
| Q9 | Status names and the New vs Awaiting POP distinction | 4.1 |
| Q10 | Notify the customer on expiry? | 5.5 |
| Q11 | Balance payment and cancellation policy | 2.5, 2.6 |
| Q12 | Max tiers = 3? | 1.4.1 |
| Q13 | Show servings per size? | 1.4.2 |
| Q14 | "Varies" add-ons, character and wedding cakes: hidden or "request a quote"? | 1.5.3 |
| Q15 | Delivery/pickup time slot needed? | 1.6.1 |
| Q16 | Domain name | 7.8 |

The prototype's mock-order totals (e.g. Black Forest 12" delivery K1,860 vs K1,830 by the rules) are treated as illustrative. The PRD's App. B rules win.
