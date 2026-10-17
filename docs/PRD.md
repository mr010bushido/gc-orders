# PRD: Cake Booking System

## 1. Background

The business needs a way for customers to book custom cake orders online, including cake details, event date, and a deposit/payment. The owner is non-technical day-to-day but has developer support available for build and changes. Lowest ongoing cost is the top priority.

## 2. Goals

- Let customers submit a complete cake order (flavor, size, design/tier count, event date, delivery/pickup choice, contact info) without back-and-forth DMs or calls.
- Collect a deposit (or full payment) at time of booking.
- Notify customers and the owner at key steps via SMS (primary) and email.
- Give the owner a simple way to see upcoming orders and their status (new / confirmed / paid / completed).
- Keep ongoing hosting/subscription costs minimal.

## 3. Non-Goals (v1)

- Real-time delivery/courier tracking.
- Inventory or ingredient management.
- Multi-location or multi-baker support.
- Customer accounts/login (guest checkout is fine for v1).

## 4. Users

- **Customer**: browsing on mobile, wants to specify a custom cake and pay a deposit quickly.
- **Owner**: non-technical, checks orders from phone/laptop, needs to see what's due and when.

## 5. Option Comparison

| Criteria | Tidio / ManyChat (chat automation) | Custom Vercel App |
| --- | --- | --- |
| Native order form w/ cake fields | ❌ No — built for chat/FAQ flows, not structured order forms | ✅ Fully custom fields |
| Deposit/POP handling | ❌ No file upload/reference matching support | ✅ Native file upload + reference number generation |
| Ongoing cost | $0–50/mo depending on tier, but doesn't solve the actual need | Vercel hosting: $0/mo (Hobby tier likely sufficient); domain \~$12/yr; no transaction fees since payment is offline |
| Owner's day-to-day effort | Manual re-entry of orders elsewhere | Orders auto-populate in a dashboard/DB |
| Cost of future changes | Still needs custom workarounds = hidden dev cost | Direct — developer edits code |
| Data ownership | Locked into vendor | Fully owned (Postgres/DB of choice) |
| Verdict | **Wrong tool for this job** | **Better fit given developer + payment/order requirements** |

**Recommendation:** Build the custom Vercel app. It's the only option that natively supports structured cake orders + deposits, and with a developer on hand, the "ongoing cost" is just Vercel (free tier) + Stripe transaction fees — likely cheaper long-term than fighting chat-tool limitations.

## 6. Functional Requirements (v1)

### Customer-facing booking flow

1. Landing page with "Book a Cake" CTA.
2. Order form:
   - Event/delivery date (date picker, block out dates already fully booked)
   - Cake size/servings
   - Flavor(s) — dropdown or multi-select
   - Design notes / reference image upload
   - Tiers (if applicable)
   - Contact info (name, phone, email)
   - **Delivery vs Pickup**:
     - Delivery: flat **K150** fee, address captured
     - Pickup: customer receives the shop's Google Maps pin location — shown on the booking confirmation page in the portal **and** sent via SMS ([https://maps.app.goo.gl/TXkVWRMSbxbA88K26?g_st=ac](https://maps.app.goo.gl/TXkVWRMSbxbA88K26?g_st=ac))
3. Price shown as: base cake price by **flavor tier** (see Appendix A for full price list) + add-ons based on design choices (edible prints, gloss prints, message toppers, etc.) + delivery fee if applicable + desserts if ordered separately. All prices in ZMW.
4. **Lead time / rush order surcharge**: standard bookings should have at least **48 hours between order confirmation and the delivery/event date**. If the requested date is less than 48 hours away, a **20% rush surcharge** is automatically added to the **cake price only** (not applied to the delivery fee) to reflect short-notice production.
5. On submitting the order, system generates a unique **booking reference number** (e.g., CAKE-2026-0042) shown to the customer and sent via SMS and email.
6. Customer pays 50% deposit offline via mobile money, using one of:
   - **Airtel Money**: +260 77 659 7882
   - **MTN Mobile Money**: +260 96 622 2440

   Customer then returns to the booking and **pastes the payment confirmation SMS text** received from their mobile network provider (Airtel/MTN) as proof of payment — no image/screenshot upload required. Order status becomes "Awaiting Verification."

   If no POP text is submitted within **24 hours** of booking, the order auto-expires and the date reopens for other customers.
7. Owner reviews the pasted POP text against the reference number/amount and marks the order as **Confirmed (Deposit Verified)** once matched, or flags it if amount/reference doesn't match.
8. Confirmation sent via **SMS and email** once verified, and shown on the portal's confirmation/order-status page. If pickup was selected, the Google Maps pin link is included in all three.

### Owner-facing dashboard

1. Simple authenticated page (owner login only) listing orders:
   - Sortable by event date
   - Status: New → Awaiting POP → Awaiting Verification → Confirmed (Deposit Verified) → Completed → Expired
   - Click into an order to see full details, including reference number, delivery/pickup choice, and the pasted POP text
2. One-click "Verify" action once owner has checked the pasted POP text against their mobile money statement using the reference number/amount. If the amount or reference doesn't match, owner flags the order — it stays pending (not auto-rejected or auto-expired) until the owner resolves it directly with the customer.
3. Blocked dates:
   - System auto-suggests a date as "at capacity" once **10 confirmed orders** exist for that event/delivery date
   - Owner reviews the suggestion and confirms/overrides before the date is actually closed to new bookings
4. **SMS and email** notification to owner on new booking and when a customer submits POP text (so verification isn't missed).

### Out of scope for v1

- Automated pricing calculator for "varies" items (toppings, fruit toppings) and wedding cakes
- Customer order history/login

## 7. Suggested Tech Stack

- **Frontend/Backend**: Next.js on Vercel
- **Database**: Vercel Postgres or Supabase (free tier)
- **Payments**: Handled offline (mobile money) — no gateway integration needed. System generates reference numbers and captures pasted POP text (no image processing required for payment proof).
- **SMS**: **Twilio** (confirmed choice for build/launch) — credentials (Account SID, Auth Token, sender number) to be shared by the owner once implementation starts.
  - ⚠️ Per-SMS cost to Zambian numbers via Twilio runs roughly **$0.30–$0.43** — notably higher than local Zambian bulk SMS rates (\~ZMW 0.11/msg locally, via MTN/Airtel direct or a lower-cost aggregator). Worth confirming this is acceptable at expected order volume.
  - ⚠️ SMS to Zambia via Twilio is **outbound-only** — customers can't reply via SMS back into the system (standard limitation across international SMS APIs in Zambia). This is fine for notifications/confirmations but means POP submission still needs to happen through the web app, not by texting back.
  - **Lower-cost path (parallel track, non-blocking)**: MTN and Airtel Zambia both offer direct bulk SMS at local rates, but only through a sales-led business contract (no self-serve signup) — MTN's is requested via a "call back" form on mtn.zm/businesssolutions/bulk-sms/; Airtel Business Zambia is similar. This will likely take longer to set up than Twilio, so it shouldn't block the initial build. Aggregators like BudgetSMS, EasySendSMS, or Messaggio offer self-serve API access to Zambia at rates well below Twilio's (without needing a direct telco contract) and could be a faster/cheaper swap-in later if Twilio's cost becomes a concern at scale.
- **File upload** (design reference images only — POP no longer needs this): Vercel Blob or Supabase Storage, optional/lighter usage than originally scoped
- **Auth (owner only)**: simple password/magic-link auth (e.g., NextAuth) — no need for customer accounts
- **Email**: Resend or Postmark for confirmation emails
- **Deployment / CI/CD**: Vercel's native Git integration — connect the GitHub repo and every push gets an automatic build:
  - Pushes to feature branches / PRs → **Preview deployments** (shareable URL per branch, safe to test before merging)
  - Merge to `main` → **automatic production deploy**, no manual release step
  - Build failures block the deploy and surface directly in the GitHub PR, so broken code never reaches production
  - Environment variables (Twilio keys, DB connection string, etc.) managed in the Vercel dashboard, separated by Preview/Production environment

## 8. Cost Estimate

| Item | Cost |
| --- | --- |
| Vercel hosting | $0/mo (Hobby tier) |
| Database (Supabase/Vercel Postgres free tier) | $0/mo |
| Domain | \~$12/yr |
| SMS notifications (Twilio, \~$0.30–0.43 per SMS to Zambian numbers) | Scales with order volume — est. 3–4 SMS per booking (confirmation, POP received, verified, pickup pin if applicable) |
| File storage (design reference images, free tier) | $0/mo up to volume limits |
| Email service (Resend free tier) | $0/mo up to volume limits |
| **Total fixed monthly cost** | **\~$0–5/mo + SMS usage fees** — no payment transaction fees, since payment is offline |

## 9. Open Questions

None outstanding.

## 10. Phased Rollout

- **Phase 1 (MVP)**: Booking form (incl. delivery/pickup + rush surcharge logic) + reference number generation + text-based POP submission/verification + SMS & email notifications + owner dashboard with blocked-dates auto-suggestion.
- **Phase 2**: Basic reporting (upcoming orders this week/month).
- **Phase 3**: Customer order history, automated pricing calculator.

## Appendix A: Price List (ZMW)

### Cake Flavors

| Flavor | Price |
| --- | --- |
| Vanilla | K1300 |
| Chocolate | K1300 |
| Chocolate Mint | K1300 |
| Lemon | K1300 |
| Banana Cinnamon | K1300 |
| Vanilla Caramel | K1400 |
| Lemon Blueberry | K1400 |
| Cookies & Cream | K1400 |
| Carrot Cake | K1400 |
| Blueberry & Orange | K1400 |
| Apple Spice | K1400 |
| Black Forest | K1400 |
| Traditional Fruit Cake | K2000 |

**Frosting available** (no separate charge indicated): American buttercream, Swiss Meringue buttercream, Fino Whip

### Special Diet Bakes

| Type | Flavors | Price |
| --- | --- | --- |
| Vegan | Vanilla, Chocolate, Carrot | K1700 |
| Diabetic | Lemon, Carrot Banana, Traditional Fruit Cake | K1700 |

### Add-Ons

| Add-on | Price |
| --- | --- |
| Chocolate Drip | Inclusive (free) |
| Toppings | Varies |
| Fruit toppings | Varies |
| Edible prints | K100 |
| Gloss prints | K75 |
| Message topper | K100 |

**Character (Bespoke) Cakes**: K1300 minimum **Wedding Cakes**: Priced separately, not covered by this list

### Desserts

All desserts K30 each, **minimum order of 30 per dessert type**.

- Assorted cupcakes (Vanilla, Chocolate, Red Velvet, Lemon Poppy, Carrot, Cookies n Cream, Mint-Choc, Lemon-Blueberry, etc.)
- Brownies
- Lemon Bars (pastry, lemon curd filling, whipped cream)
- Cake Cups (flavor of choice, layered with filling and frosting)
- Cheesecake Cups (Lemon, Oreo, Nutella)
- Chocolate Mousse
- Trifle in a Cup (cake base, seasonal fruits, custard, jelly, whipped cream)
- Coconut Balls (Bounty-bar style)
- Milk Tart
- Apple Crumble
- Cake Pops

*Note: "Varies" items (Toppings, Fruit toppings) and Wedding Cakes need explicit pricing rules from the owner before the order form/price calculator can be fully automated — flag these for follow-up if full price automation is wanted in v1.*

## Appendix B: Proposed Dynamic Pricing Model (Size/Tiers)

The price list in Appendix A is anchored to a **10-inch single-tier cake**. To support other sizes and multi-tier cakes, propose a **multiplier table** applied to the base flavor price — stored as an editable config (not hardcoded), so the owner can adjust multipliers later without needing a developer.

### Single-tier size multipliers (confirmed starting point — owner to adjust if needed)

Range: **8" (smallest) to 16" (largest)**, stepping by **20% per 2" size increment**, anchored to 10" = 1.0x (matches Appendix A base prices).

| Size | Multiplier | Example (Tier 1 flavor, K1300 base) |
| --- | --- | --- |
| 8" | 0.80x | K1040 |
| 10" | 1.0x (baseline) | K1300 |
| 12" | 1.20x | K1560 |
| 14" | 1.44x | K1872 |
| 16" | 1.73x | K2249 |

*(Each step up multiplies the previous size by 1.2; each step down multiplies by 0.8 — compounding, not flat, so the increments grow slightly at larger sizes.)*

### Multi-tier cakes

For a cake with multiple tiers of different sizes, sum the multipliers for each tier size, then apply that combined multiplier to the base flavor price.

*Example: a 3-tier cake at 8" + 10" + 12" = 0.80 + 1.0 + 1.20 = 3.0x multiplier → 3.0 × K1300 = K3900 for a Tier 1 flavor.*

### How this plugs into the order form

1. Customer selects flavor (determines base price tier: K1300/K1400/K2000/K1700).
2. Customer selects size (single tier) or adds multiple tiers with individual sizes.
3. System looks up the multiplier(s), sums if multi-tier, and multiplies against the base flavor price.
4. Add-ons (prints, toppers, delivery, rush surcharge) are added after this base calculation.

**Why a config table instead of hardcoded logic**: cake costs don't scale perfectly linearly with size (larger cakes have proportionally less crust/decoration cost, labor doesn't scale 1:1, etc.), so bakers typically adjust multipliers based on real experience. Keeping this as an editable table means the owner can tune pricing over time without waiting on developer changes.

**Confirmed as starting point** — the owner will adjust these multipliers over time based on real-world costs, without needing developer changes, since it's stored as an editable config table.