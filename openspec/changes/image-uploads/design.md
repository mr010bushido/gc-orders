## Context

`ImageStore` is `put`, `createSignedUrl`, `delete`; images are private; limits are enforced by repository code before calling it. Customers book from phones on mobile data. iPhones capture HEIC, which the decided limits list (Q39).

## Goals / Non-Goals

**Goals:**
- No original large file reaches storage; no location metadata is kept.
- A customer can attach photos before the order exists.

**Non-Goals:**
- Antivirus scanning, moderation, CDN delivery.

## Decisions

- **Upload first, attach on submit.** The order does not exist while the customer is on step 2, so each upload creates an `order_images` row with `order_id` null and returns a random 128-bit token (stored hashed). The booking request lists the tokens; order creation sets `order_id` for those rows in the same transaction. Unattached rows older than 24 hours are removed by the retention job.
- **Detect type by content, not by header.** The first bytes are checked against JPEG, PNG and WebP signatures, and `sharp` must decode the file. The `Content-Type` and file name are ignored.
- **Process with `sharp`.** Rotate by EXIF orientation, resize so the longest edge is at most 1600px without enlarging, re-encode as WebP at quality 82. Re-encoding drops EXIF and location data. Output is a few hundred KB.
- **HEIC is handled by the phone.** The file input lists `image/jpeg,image/png,image/webp` in `accept`, which makes iOS convert photos to JPEG on selection. The client also downscales to 1600px with a canvas before upload, which cuts mobile data use. The server rejects raw HEIC with a message to choose another photo. Q39 listed HEIC; the prebuilt `sharp` cannot decode HEVC, so this is the practical way to honour the intent. A server-side decoder can be added later if real users hit it.
- **Limits.** 5 MB before processing, 3 images per order, 20 uploads per client address per hour via the `RateLimiter`, and at most 6 pending uploads per address at once.
- **Keys.** `images/<imageId>.webp` in the private bucket. The key never contains a customer or order identifier.
- **Display.** Only the owner sees images, through `createSignedUrl(key, 300)` generated on render. Customers see their own thumbnails only during upload, from local object URLs.
- **Supabase Storage adapter** implements `ImageStore` with the service role key on the server; the bucket is private and has no public policy. It passes `imageStoreContract`.

## Risks / Trade-offs

- [`sharp` is a native module] → It is the same one `next/image` uses, works on Vercel and on a VPS image, and the install is proven in CI.
- [Orphaned uploads] → The 24-hour sweep in `data-retention`, and the per-address cap on pending uploads.
- [A customer rotates or crops badly before upload] → The server also applies EXIF orientation.
- [Large uploads time out on slow links] → Client downscaling usually brings the file under 500 KB.
