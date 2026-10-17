## 1. Backend (Codex)

- [ ] 1.1 Add `sharp`; `lib/images/process.ts` (signature check, decode, rotate, resize to 1600px, WebP, strip metadata); tests with fixture images including GPS EXIF, oversized, tiny and a renamed PDF
- [ ] 1.2 Schema and migration for `order_images` (id, order id nullable, key, bytes, width, height, token hash, created at; RLS on)
- [ ] 1.3 `POST /api/uploads` and `DELETE /api/uploads/[id]` with limits, the `RateLimiter` and the pending cap; route tests for every error code
- [ ] 1.4 Extend the booking schema with `imageTokens` and attach in `createOrder`'s transaction; tests for three, four and wrong tokens
- [ ] 1.5 Supabase Storage `ImageStore` adapter passing `imageStoreContract` with a mocked client; storage env names in `.env.example`
- [ ] 1.6 `getOrderImageUrls(orderId)` for the owner, which issues 300-second signed URLs; test that it needs the owner guard

## 2. Frontend (Claude)

- [ ] 2.1 `ImageUploader` component (canvas downscale, thumbnails, progress, remove, errors, 3 max) with tests and a gallery entry
- [ ] 2.2 Add the uploader to booking step 2 and send the tokens with the booking
- [ ] 2.3 Show the images in the owner order sheet

## 3. Integration (Claude owns this check)

- [ ] 3.1 Test: upload through the route with the in-memory store, submit a booking, open the owner sheet and see signed URLs
- [ ] 3.2 BLOCKED for a human: create a private Supabase Storage bucket and set the service role key in Vercel; record when done
- [ ] 3.3 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check:portability` pass; `openspec validate image-uploads --strict` passes
