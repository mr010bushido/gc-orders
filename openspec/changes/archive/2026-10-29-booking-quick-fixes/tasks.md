## 1. Fixes (frontend)

- [x] 1.1 `components/ui/ImageUploader.tsx`: replace `crypto.randomUUID()` with a plain local key; add a test that deletes `crypto.randomUUID` and adds a photo without error — gate: `pnpm test components/ui/ImageUploader.test.tsx --maxWorkers=2` → 5 passed
- [x] 1.2 `app/page.tsx`: add a ghost "Find my booking" link to `/order` under "Book a Cake"; add or update a test that both links render with the right `href` — gate: `pnpm test app/page.dom.test.tsx --maxWorkers=2` → 1 passed
- [x] 1.3 Owner order list: move the New and Anonymised tags into the card's top line (optional `badge` slot on `OrderCard` if needed), keeping token colours; update tests that assert the tag — gate: `pnpm test components/ui/OrderCard.test.tsx --maxWorkers=2` → 4 passed

## 2. Verify

- [x] 2.1 `pnpm lint`, `pnpm typecheck`, `pnpm test --maxWorkers=2`, `pnpm build`, `openspec validate booking-quick-fixes --strict` all pass — gate: lint, typecheck, 886 passed/1 skipped, build, strict validation all passed
