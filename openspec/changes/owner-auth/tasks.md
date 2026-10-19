## 1. Adapter (Codex)

- [x] 1.1 Add `@supabase/supabase-js` and `@supabase/ssr`; Supabase `OwnerAuth` adapter under `lib/platform/adapters/supabase/`; pass `ownerAuthContract` with a mocked client — gate: pnpm test lib/platform/adapters/supabase/owner-auth.test.ts --maxWorkers=2 && pnpm typecheck && pnpm lint && pnpm check:portability && openspec validate owner-auth --strict → 4 passed; all gates passed
  - Review fix (Claude fallback run): `sendMagicLink` now stores the PKCE verifier cookies Supabase writes while sending (they were dropped, so the emailed `code` link could not be exchanged); a malformed percent-encoded cookie no longer throws — gate: pnpm test lib/platform/adapters/supabase --maxWorkers=2 → 6 passed (both new tests fail without the fix)
- [x] 1.2 `lib/auth/require-owner.ts` (adapter session plus `OWNER_EMAIL` check) and tests for owner, other user and no session — gate: pnpm test lib/auth/require-owner.test.ts --maxWorkers=2 && pnpm typecheck && pnpm lint → 3 passed; gates passed
  - Review fix (Claude fallback run): `ownerForRequest` treats an adapter error (unconfigured, outage) as signed out instead of a 500 — gate: pnpm test lib/auth/require-owner.test.ts --maxWorkers=2 → 4 passed
- [x] 1.3 Login and callback route logic: generic response, send only to the owner, link completion, non-owner sign-out; tests per `owner-auth` scenario — gate: pnpm test lib/auth/login-request.test.ts lib/platform/adapters/supabase/owner-auth.test.ts --maxWorkers=2 && pnpm typecheck && pnpm lint && pnpm check:portability → 7 passed; gates passed
  - Review fix (Claude fallback run): the link origin now comes from `APP_URL` (`loginOrigin`), falling back to the request host only when unset, so a forged Host header cannot aim the owner's link elsewhere — gate: pnpm test lib/auth/login-request.test.ts --maxWorkers=2 → 5 passed
- [x] 1.4 Login rate limit via the shared limiter, with tests — gate: pnpm test lib/auth/login-request.test.ts --maxWorkers=2 && pnpm lint → 3 passed; lint passed
- [x] 1.5 Guard-coverage test that fails if a protected exported handler under `app/owner` does not begin with awaited `requireOwner()` after any directives — gate: pnpm test lib/auth/owner-guard-coverage.test.ts --maxWorkers=2 && pnpm typecheck && pnpm lint → passed; review regression fixtures reject dead, late, nested and unawaited calls and accept action/route/page/layout forms; focused suite 18 passed
  - Review fix (Claude fallback run): the coverage scan also catches exported arrow/function-expression actions, re-exports, default exports, and `page`/`layout` default exports; the unguarded-export failure is proven by temporary fixtures inside the test (5 cases) — gate: pnpm test lib/auth/owner-guard-coverage.test.ts --maxWorkers=2 → 7 passed
- [x] 1.6 `proxy.ts` session refresh and redirect for signed-out `/owner/**` visitors, with no-store/noindex headers — gate: pnpm test proxy.test.ts lib/platform/adapters/supabase/proxy-session.test.ts --maxWorkers=2 && pnpm typecheck && pnpm lint && pnpm check:portability → passed; adapter refresh forwards cookie updates and SSR cache headers to downstream request and response, including redirects; focused suite 18 passed
- [x] 1.7 Names only in `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OWNER_EMAIL` — gate: pnpm check:portability && openspec validate owner-auth --strict → portability passed; change valid

## 2. Screens (Claude)

- [x] 2.1 `/owner/login` page with accessible initial, sent, link-error, not-configured and rate-limited states — gate: pnpm test app/owner/login/login-form.dom.test.tsx --maxWorkers=2 → 9 passed
- [x] 2.2 Guarded owner console shell with nav, theme toggle, sign out, sans font only; `/owner` redirects to `/owner/orders`, with an orders placeholder — gate: pnpm typecheck && pnpm lint → passed
- [x] 2.3 Component tests for the login states (initial, sent, link error, not configured and rate limited) — gate: pnpm test app/owner/login/login-form.dom.test.tsx --maxWorkers=2 → 9 passed

## 3. Integration (Claude owns this check)

- [x] 3.1 Test with the in-memory `OwnerAuth` fake: logged-out access redirects, owner access renders, another user is refused — gate: pnpm test app/owner/owner.integration.test.tsx --maxWorkers=2 → 5 passed
- [ ] 3.2 HUMAN (not for agents): [ ] Disable public signups in Supabase [ ] Create the owner user [ ] Configure Resend SMTP [ ] Add preview and production `/owner/auth/callback` redirect URLs — instructions recorded in README.md
- [x] 3.3 `pnpm lint`, `pnpm typecheck`, `pnpm test --maxWorkers=2`, `env -u DATABASE_URL -u DATABASE_MIGRATION_URL -u NEXT_PUBLIC_SUPABASE_URL -u NEXT_PUBLIC_SUPABASE_ANON_KEY -u OWNER_EMAIL pnpm build`, `pnpm check:portability` pass; `openspec validate owner-auth --strict` passes — rerun after review fixes: all gates passed (743 tests passed, 1 skipped; 71 files passed, 1 skipped)
