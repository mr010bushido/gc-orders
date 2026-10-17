## Why

Customers attach reference photos for their cake design (PRD §6; PBS 1.5.1, Q39), and quote requests depend on photos. Images are private, large on mobile data and carry location metadata, so they need an upload path that limits size, strips metadata and never serves a public URL.

## What Changes

- `POST /api/uploads`: accepts one image per request, checks size (5 MB) and type by content (JPEG, PNG, WebP), resizes it (longest edge 1600px), strips metadata, stores it through `ImageStore` and returns an upload id and a one-time attach token.
- `DELETE /api/uploads/[id]`: removes a pending upload given its token.
- `ImageUploader` component for the booking wizard and quote form: pick up to 3 photos, client-side downscale before upload, thumbnails, progress, remove, clear errors.
- A booking request may carry up to 3 attach tokens; the order creation step attaches those images to the order.
- Owner order sheet shows the images through short-lived signed URLs.
- Supabase Storage adapter for `ImageStore` behind the `platform-portability` interface.

Out of scope: video, galleries for customers, image editing, deleting images after the event (`data-retention`).

## Capabilities

### New Capabilities
- `design-images`: upload rules, storage, attachment to orders, display to the owner.

### Modified Capabilities
None. The extra field on the booking request is stated in `design-images` and recorded in `booking-submission` when this change is archived.

## Impact

- New: `app/api/uploads/*`, `lib/images/*`, `lib/platform/adapters/supabase/image-store.ts`, `components/ui/ImageUploader.tsx`, `order_images` migration, tests.
- New dependency: `sharp`. Modified: the booking schema (`imageTokens`), the booking wizard step 2, the owner order sheet.
- Cross-cutting: Codex owns the route, processing and adapter; Claude owns the uploader and the sheet section; Claude owns the integration check.
- Depends on `platform-portability` (`ImageStore`), `booking-flow`, `owner-orders`, `design-system-components`.
- Linear issue: created when the implementer is delegated.
