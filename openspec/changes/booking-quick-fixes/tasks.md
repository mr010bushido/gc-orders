## 1. Fixes (frontend)

- [ ] 1.1 `components/ui/ImageUploader.tsx`: replace `crypto.randomUUID()` with a plain local key; add a test that deletes `crypto.randomUUID` and adds a photo without error
- [ ] 1.2 `app/page.tsx`: add a ghost "Find my booking" link to `/order` under "Book a Cake"; add or update a test that both links render with the right `href`
- [ ] 1.3 Owner order list: move the New and Anonymised tags into the card's top line (optional `badge` slot on `OrderCard` if needed), keeping token colours; update tests that assert the tag

## 2. Verify

- [ ] 2.1 `pnpm lint`, `pnpm typecheck`, `pnpm test --maxWorkers=2`, `pnpm build`, `openspec validate booking-quick-fixes --strict` all pass
