## ADDED Requirements

### Requirement: Platform code stays behind interfaces we own
Application code SHALL reach owner authentication, image storage and scheduled-job heartbeats only through the interfaces in `lib/platform/`. Platform-specific implementations SHALL live under `lib/platform/adapters/<name>/`. Only `lib/platform/adapters/supabase/` MAY import `@supabase/*`.

#### Scenario: Supabase import outside the adapter
- **WHEN** a file outside `lib/platform/adapters/supabase/` imports `@supabase/supabase-js` or `@supabase/ssr`
- **THEN** `pnpm check:portability` fails and names the file and line

#### Scenario: Feature code uses the interface
- **WHEN** a booking or owner feature needs to read the current owner or store an image
- **THEN** it calls `OwnerAuth` or `ImageStore` and does not import a vendor SDK

### Requirement: OwnerAuth interface
`OwnerAuth` SHALL provide `sendMagicLink(email, redirectTo)`, `completeLogin(params)` returning an `Owner` (`{ id, email }`) or null, `getOwner(headers)` returning an `Owner` or null, and `signOut(headers)`. Enforcing that only the single allowed owner email may log in SHALL be done by repository code around the adapter, not inside it.

#### Scenario: Not signed in
- **WHEN** `getOwner` is called with headers that carry no valid session
- **THEN** it returns null

#### Scenario: Valid link completes login
- **WHEN** `completeLogin` receives the parameters from a link issued by `sendMagicLink`
- **THEN** it returns the owner for that email

#### Scenario: Invalid or reused link
- **WHEN** `completeLogin` receives parameters that are invalid or already used
- **THEN** it returns null and creates no session

#### Scenario: Signed out
- **WHEN** `signOut` is called and `getOwner` is called with the same headers afterwards
- **THEN** `getOwner` returns null

### Requirement: ImageStore interface
`ImageStore` SHALL provide `put(key, bytes, contentType)`, `createSignedUrl(key, ttlSeconds)` and `delete(key)`. Stored images SHALL be private: a signed URL is the only way to read one. Size, count and content-type limits SHALL be enforced by repository code before calling the store.

#### Scenario: Round trip
- **WHEN** an image is stored with `put` and a signed URL is requested for its key
- **THEN** the URL is returned and the image can be read through it until the TTL expires

#### Scenario: Missing key
- **WHEN** a signed URL is requested for a key that was never stored or was deleted
- **THEN** the call rejects and returns no URL

#### Scenario: Delete is idempotent
- **WHEN** `delete` is called twice for the same key
- **THEN** neither call throws

### Requirement: Adapters must pass the shared contract tests
The repository SHALL export `ownerAuthContract` and `imageStoreContract` test suites. Every implementation of `OwnerAuth` or `ImageStore`, including in-memory fakes, SHALL pass the suite for its interface.

#### Scenario: Fake implementation
- **WHEN** the in-memory `OwnerAuth` and `ImageStore` fakes run the contract suites
- **THEN** all scenarios pass

#### Scenario: New adapter
- **WHEN** a Supabase or VPS adapter is added
- **THEN** its tests call the same contract suite and pass it before it is used

### Requirement: Forbidden platform patterns fail CI
`pnpm check:portability` SHALL fail when it finds: an import of `@vercel/kv`, `@vercel/blob`, `@vercel/edge-config` or `@vercel/postgres`; a `crons` key in `vercel.json`; an import of `@supabase/*` outside `lib/platform/adapters/supabase/`; or the text `auth.uid()`, `auth.jwt()`, `auth.users` or `storage.objects` in SQL, migrations or source files outside that directory. The CI workflow SHALL run it on every pull request.

#### Scenario: Vercel storage import
- **WHEN** a source file imports `@vercel/blob`
- **THEN** the check fails with the file and line

#### Scenario: Cron in vercel.json
- **WHEN** `vercel.json` contains a `crons` entry
- **THEN** the check fails

#### Scenario: Supabase-only SQL
- **WHEN** a migration references `auth.uid()`
- **THEN** the check fails

#### Scenario: Clean repository
- **WHEN** none of the patterns appear
- **THEN** the check exits 0

### Requirement: Standalone build is proven in CI
CI SHALL build the app with `NEXT_OUTPUT=standalone`, start the resulting `.next/standalone/server.js`, and require `GET /api/health` to return 200. The default build, without that variable, SHALL NOT change.

#### Scenario: Standalone server answers
- **WHEN** the CI job builds with `NEXT_OUTPUT=standalone` and starts the server
- **THEN** `/api/health` returns 200

#### Scenario: Default build unchanged
- **WHEN** the app is built without `NEXT_OUTPUT`
- **THEN** `next.config.ts` sets no `output` option

### Requirement: Guardrail text names the mechanism
The "Portability guardrails" section SHALL be identical in `CLAUDE.md` and `AGENTS.md` and SHALL name `lib/platform/`, the adapters directory and `pnpm check:portability`.

#### Scenario: Docs agree
- **WHEN** the portability section changes in one file
- **THEN** the same change is made in the other
