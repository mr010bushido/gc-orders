## 1. Backend (Codex)

- [x] 1.1 Add `sharp`; `lib/images/process.ts` (signature check, decode, rotate, resize to 1600px, WebP, strip metadata); tests with fixture images including GPS EXIF, oversized, tiny and a renamed PDF — gate: `pnpm test lib/images/process.test.ts` → 3 passed; `pnpm install --frozen-lockfile --store-dir /tmp/cakes-jms197-pnpm-store` → 458 downloaded, passed
- [x] 1.2 Schema and migration for `order_images` (id, order id nullable, key, bytes, width, height, token hash, created at; RLS on; address hash for the pending cap) — gate: `pnpm test lib/db/schema.test.ts lib/db/migrations.test.ts` → 9 passed
- [x] 1.3 `POST /api/uploads` and `DELETE /api/uploads/[id]` with limits, the `RateLimiter` and the pending cap; route tests for every error code — gate: `pnpm test lib/images/process.test.ts lib/images/http.test.ts` → 6 passed; `pnpm typecheck` → passed
- [x] 1.4 Extend the booking schema with `imageTokens` and attach in `createOrder`'s transaction; tests for three, four and wrong tokens — gate: `pnpm test lib/booking/create-booking.test.ts` → 16 passed; `pnpm typecheck` → passed
- [x] 1.5 Supabase Storage `ImageStore` adapter passing `imageStoreContract` with a mocked client; storage env names in `.env.example` — gate: `pnpm test lib/platform/adapters/supabase/image-store.test.ts` → 4 passed
- [x] 1.6 `getOrderImageUrls(orderId)` for the owner, which issues 300-second signed URLs; test that it needs the owner guard — gate: `pnpm test lib/images/owner.test.ts` → 2 passed; `pnpm typecheck` → passed

## 2. Frontend (Claude)

- [x] 2.1 `ImageUploader` component (canvas downscale, thumbnails, progress, remove, errors, 3 max) with tests and a gallery entry — gates: `pnpm test components/ui/ImageUploader.test.tsx` (4 passed), `pnpm lint` (passed), `pnpm typecheck` (passed), `openspec validate image-uploads --strict` (valid)
- [x] 2.2 Add the uploader to booking step 2 and send the tokens with the booking — gate: `pnpm test --maxWorkers=2 app/book/wizard.dom.test.tsx app/images.integration.test.tsx components/ui/ImageUploader.test.tsx app/owner/owner.integration.test.tsx` → 24 passed; full `pnpm test --maxWorkers=2` → 830 passed, 1 existing skip
- [x] 2.3 Show the images in the owner order sheet — gate: `pnpm test --maxWorkers=2 app/book/wizard.dom.test.tsx app/images.integration.test.tsx components/ui/ImageUploader.test.tsx app/owner/owner.integration.test.tsx` → 24 passed; `pnpm lint` and `pnpm typecheck` → passed

## 3. Integration (Claude owns this check)

- [x] 3.1 Test: upload through the route with the in-memory store, submit a booking, open the owner sheet and see signed URLs — gate: `pnpm test --maxWorkers=2 app/images.integration.test.tsx` → 1 passed; final gates: lint, typecheck, full test (830 passed, 1 existing skip), build, portability, and strict OpenSpec validation all passed
- [ ] BLOCKED: Who can complete the required human-only provisioning? — 3.2 BLOCKED for a human: create a private Supabase Storage bucket and set the service role key in Vercel; record when done
- [ ] 3.3 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check:portability` pass; `openspec validate image-uploads --strict` passes
