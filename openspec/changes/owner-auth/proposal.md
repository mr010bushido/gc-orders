## Why

The owner dashboard must be private. The PRD asks for owner-only login and the decisions settled on Supabase Auth magic links for a single allowed email (PBS Q26, Q34). `platform-portability` defines the `OwnerAuth` interface and its contract tests; this change builds the Supabase adapter, the login screens and the guard every owner route and action uses.

## What Changes

- Supabase adapter for `OwnerAuth` under `lib/platform/adapters/supabase/`, passing the shared contract suite.
- `OWNER_EMAIL` setting: only that email can get a link or hold a session. Anyone else gets the same on-screen response and no email.
- `/owner/login` (email field, "Send me a link") and `/owner/auth/callback` (completes login, rejects a non-owner session).
- `requireOwner()` guard called in the owner layout and at the top of every owner server action. A `proxy.ts` redirect for signed-out visitors is a convenience only.
- Owner shell layout (Inter only): navigation, theme toggle, sign out. Later changes add their nav items.
- Login requests are rate limited, owner pages are `noindex` and `no-store`.
- A list of manual Supabase steps for a human (disable public signups, create the owner user, set Resend as SMTP, set redirect URLs).

Out of scope: customer accounts, multiple owners or roles, passwords, MFA.

## Capabilities

### New Capabilities
- `owner-auth`: single-owner magic-link login, session guard, owner shell and login rate limiting.

### Modified Capabilities
None.

## Impact

- New: `lib/platform/adapters/supabase/*`, `lib/auth/require-owner.ts`, `app/owner/*`, `proxy.ts`, tests.
- New dependencies: `@supabase/supabase-js`, `@supabase/ssr`. New environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OWNER_EMAIL`.
- Cross-cutting: Codex owns the adapter and guard; Claude owns the login page and shell and the integration check.
- Depends on `platform-portability` (JMS-165) and `design-system-components`. A human performs the Supabase setup; agents cannot.
- Linear issue: created when the implementer is delegated.
