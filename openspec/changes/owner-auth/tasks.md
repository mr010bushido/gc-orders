## 1. Adapter (Codex)

- [x] 1.1 Add `@supabase/supabase-js` and `@supabase/ssr`; Supabase `OwnerAuth` adapter under `lib/platform/adapters/supabase/`; pass `ownerAuthContract` with a mocked client — gate: pnpm test lib/platform/adapters/supabase/owner-auth.test.ts --maxWorkers=2 && pnpm typecheck && pnpm lint && pnpm check:portability && openspec validate owner-auth --strict → 4 passed; all gates passed
- [x] 1.2 `lib/auth/require-owner.ts` (adapter session plus `OWNER_EMAIL` check) and tests for owner, other user and no session — gate: pnpm test lib/auth/require-owner.test.ts --maxWorkers=2 && pnpm typecheck && pnpm lint → 3 passed; gates passed
- [ ] 1.3 Login and callback route logic: generic response, send only to the owner, link completion, non-owner sign-out; tests per `owner-auth` scenario
- [ ] 1.4 Login rate limit via the shared limiter, with tests
- [ ] 1.5 Guard-coverage test that fails if an exported action under `app/owner` lacks `requireOwner()`
- [ ] 1.6 `proxy.ts` redirect for signed-out `/owner/**` visitors, and the no-store/noindex headers
- [ ] 1.7 Names only in `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OWNER_EMAIL`

## 2. Screens (Claude)

- [ ] 2.1 `/owner/login` page with the email field and the generic confirmation
- [ ] 2.2 `app/owner/layout.tsx` shell: nav, theme toggle, sign out, sans font only; `/owner` redirects to `/owner/orders`
- [ ] 2.3 Component tests for the login states (initial, sent, link error)

## 3. Integration (Claude owns this check)

- [ ] 3.1 Test with the in-memory `OwnerAuth` fake: logged-out access redirects, owner access renders, another user is refused
- [ ] 3.2 BLOCKED for a human: in Supabase disable public signups, create the owner user, set Resend SMTP, add the preview and production redirect URLs; record when done
- [ ] 3.3 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check:portability` pass; `openspec validate owner-auth --strict` passes
