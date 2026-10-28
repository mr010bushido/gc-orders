## Why

Phone testing on 2026-10-28 found three small defects that need no product decision:

- JMS-204 (part b): adding a reference photo crashes with `crypto.randomUUID is not a function`. Browsers expose `crypto.randomUUID` only in secure contexts (HTTPS or localhost), so the uploader fails on plain HTTP, for example a LAN dev server. The key it makes is only a React list key.
- JMS-202: a customer cannot find an in-flight order from the home page. `/order` ("Find my booking") exists, but the landing page links only to `/book`.
- JMS-209: the owner order list's "New" tag is absolutely positioned over the order total, hiding the amount. The "Anonymised" tag sits in the same spot.

The rest of JMS-204 (cake vs custom quote) and the related JMS-203, JMS-208 and JMS-210 are separate work and not part of this change.

## What Changes

- `ImageUploader` makes its per-photo key without `crypto.randomUUID`, so it works in any browser context.
- The landing page adds a ghost "Find my booking" link to `/order` under the primary "Book a Cake" button.
- The owner order list shows the New and Anonymised tags beside the reference line, where they cover neither the total nor the status pill.

## Capabilities

### Modified Capabilities

- `design-images`: the uploader works outside secure contexts.
- `booking-wizard`: the landing page offers a secondary path to find a booking.
- `owner-orders`: the New and Anonymised tags must not cover order data.

## Impact

Frontend only: `components/ui/ImageUploader.tsx`, `app/page.tsx`, `app/owner/(console)/orders/orders-list.tsx` (possibly `components/ui/OrderCard.tsx`), plus their tests. No schema, server or API change.
