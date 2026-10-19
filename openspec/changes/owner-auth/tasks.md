## 1. Adapter (Codex)

- [x] 1.1 Add `@supabase/supabase-js` and `@supabase/ssr`; Supabase `OwnerAuth` adapter under `lib/platform/adapters/supabase/`; pass `ownerAuthContract` with a mocked client — gate: pnpm test lib/platform/adapters/supabase/owner-auth.test.ts --maxWorkers=2 && pnpm typecheck && pnpm lint && pnpm check:portability && openspec validate owner-auth --strict → 4 passed; all gates passed
  - Review fix (Claude fallback run): `sendMagicLink` now stores the PKCE verifier cookies Supabase writes while sending (they were dropped, so the emailed `code` link could not be exchanged); a malformed percent-encoded cookie no longer throws — gate: pnpm test lib/platform/adapters/supabase --maxWorkers=2 → 6 passed (both new tests fail without the fix)
- [x] 1.2 `lib/auth/require-owner.ts` (adapter session plus `OWNER_EMAIL` check) and tests for owner, other user and no session — gate: pnpm test lib/auth/require-owner.test.ts --maxWorkers=2 && pnpm typecheck && pnpm lint → 3 passed; gates passed
  - Review fix (Claude fallback run): `ownerForRequest` treats an adapter error (unconfigured, outage) as signed out instead of a 500 — gate: pnpm test lib/auth/require-owner.test.ts --maxWorkers=2 → 4 passed
- [x] 1.3 Login and callback route logic: generic response, send only to the owner, link completion, non-owner sign-out; tests per `owner-auth` scenario — gate: pnpm test lib/auth/login-request.test.ts lib/platform/adapters/supabase/owner-auth.test.ts --maxWorkers=2 && pnpm typecheck && pnpm lint && pnpm check:portability → 7 passed; gates passed
  - Review fix (Claude fallback run): the link origin now comes from `APP_URL` (`loginOrigin`), falling back to the request host only when unset, so a forged Host header cannot aim the owner's link elsewhere — gate: pnpm test lib/auth/login-request.test.ts --maxWorkers=2 → 5 passed
- [x] 1.4 Login rate limit via the shared limiter, with tests — gate: pnpm test lib/auth/login-request.test.ts --maxWorkers=2 && pnpm lint → 3 passed; lint passed
- [x] 1.5 Guard-coverage test that fails if an exported action under `app/owner` lacks `requireOwner()` — gate: pnpm test lib/auth/owner-guard-coverage.test.ts --maxWorkers=2 && pnpm typecheck && pnpm lint → 2 passed; gates passed
  - Review fix (Claude fallback run): the coverage scan also catches exported arrow/function-expression actions, re-exports, default exports, and `page`/`layout` default exports; the unguarded-export failure is proven by temporary fixtures inside the test (5 cases) — gate: pnpm test lib/auth/owner-guard-coverage.test.ts --maxWorkers=2 → 7 passed
- [x] 1.6 `proxy.ts` redirect for signed-out `/owner/**` visitors, and the no-store/noindex headers — gate: pnpm test proxy.test.ts --maxWorkers=2 && pnpm typecheck && pnpm lint && pnpm check:portability → 3 passed; all gates passed
- [x] 1.7 Names only in `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OWNER_EMAIL` — gate: pnpm check:portability && openspec validate owner-auth --strict → portability passed; change valid

## 2. Screens (Claude)

- [ ] 2.1 `/owner/login` page with the email field and the generic confirmation
- [ ] 2.2 `app/owner/layout.tsx` shell: nav, theme toggle, sign out, sans font only; `/owner` redirects to `/owner/orders`
- [ ] 2.3 Component tests for the login states (initial, sent, link error)

## 3. Integration (Claude owns this check)

- [ ] 3.1 Test with the in-memory `OwnerAuth` fake: logged-out access redirects, owner access renders, another user is refused
- [ ] 3.2 BLOCKED for a human: in Supabase disable public signups, create the owner user, set Resend SMTP, add the preview and production redirect URLs; record when done
- [ ] 3.3 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check:portability` pass; `openspec validate owner-auth --strict` passes
