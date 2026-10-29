## Context

The wizard (`app/book/wizard.tsx`) keeps one draft with an optional `cake`, `desserts[]` and an optional `quoteRequest {kind, description}` plus `imageTokens`. The server (`createBooking`) prices any cake and desserts with `priceBasket`. If a `quoteRequest` is present, it creates the order in `awaiting_quote`, storing the priced lines, and the owner appends quote lines (quote-requests spec). That data model already supports all three decided flows, so this change is mostly UI plus two server guards.

## Decisions

**Order type is derived, not stored.** The draft gains a UI-only `cakeChoice: "none" | "menu" | "wedding"`. On submit it maps onto the existing request:

| Choice | `cake` | `quoteRequest` | Resulting status |
|---|---|---|---|
| menu, not customised | set | absent | `awaiting_payment` |
| menu, customised | set | kind ∈ {character_cake, toppings, other} | `awaiting_quote` (cake line = base) |
| wedding | absent | kind = `wedding_cake` | `awaiting_quote` (total K0) |
| none (desserts only) | absent | absent | `awaiting_payment` |

Desserts may accompany any row. No DB column or migration is needed.

**Server guards** (in `createBooking` validation, alongside `EMPTY_BASKET`):
- `quoteRequest.kind === "wedding_cake"` with `cake` set → `_form: WEDDING_WITH_CAKE`.
- any other `quoteRequest.kind` without `cake` → `quoteDescription: QUOTE_NEEDS_CAKE`.

Add both codes to `BOOKING_ERROR_CODES` and give them friendly wizard messages. These guards are what stop the JMS-208 shape from arising through a crafted or stale request.

**Step 1 UI.** Three choice cards in a single column on mobile, using the existing `RadioCardGroup` pattern or an equivalent token-only card button:
- "Cake from our price list": price-list cakes, including character cakes.
- "Wedding cake": "Tell us your vision and we'll send a quote".
- "Desserts": selecting it reveals the existing dessert lines.

The two cake cards act as one radio group, and a second tap on the selected card clears it. Desserts is an independent toggle. Each card is a real button or radio with a visible label and a ≥44px target. There is still only one filled primary button on the screen (Continue). The flavour and frosting pickers for a menu cake stay on step 1 where they are today.

**Steps.** Choose items → (Cake details | Wedding details | skipped for desserts only) → Delivery and details → Review. The Wedding details step uses the same heading level and form controls as Cake details. Its description field has helper text prompting for guest count, number of tiers, theme or colours, and flowers. It reuses `ImageUploader`. The minimum of 10 characters is unchanged.

**Customise toggle** on Cake details: a checkbox "Customise this cake (character design, special toppings…)". When on, it shows the request type select (character cake, toppings, other; wedding is not offered here), the description and the `ImageUploader`. When off, it clears `quoteRequest`. Reference photos for a non-customised cake stay where they are today, if anywhere; do not change that behaviour.

**Stepper (JMS-210).** `Stepper` gains a way to hide the total. On step 1 it renders "Step 1 · Choose items" and no progress segments beyond the first. From step 2 it renders "Step N of M · Name" as today. The dessert-only scenario in the spec still reads "Step 2 of 3".

**Labels.** In the wizard review and the owner sheet, when the order has a quote request and priced lines, the subtotal label reads "Base price (price list)". The owner list summary already names the quote kind.

## Risks

- Session-storage drafts saved before the change may hold `quoteRequest` without a cake. On restore, map a draft with `quoteRequest.kind === "wedding_cake"` to `cakeChoice: "wedding"`. Map any other kind without a cake to `cakeChoice: "none"` and drop the quote request, so the server guard is never hit by a restored draft.
- `wizard.dom.test.tsx` is large; many tests click the old checkboxes and will need updating.
