## 1. Senders

- [ ] 1.1 `lib/notify/sms.ts`, `email.ts`: interfaces, console sender, factory; tests that no credentials means no network
- [ ] 1.2 Twilio sender via `fetch` and Resend sender via `fetch`, tested with a mocked `fetch`; no secret in errors
- [ ] 1.3 Add the credentials to `.env.example` (names only)

## 2. Log and events

- [ ] 2.1 Schema and migration for `notification_log` (RLS on; unique order/event/channel for once-only events)
- [ ] 2.2 Event-to-recipients table and `notify(event, ctx)` that never throws; tests for each event, skipped channels and duplicate triggers
- [ ] 2.3 Recipient masking and error summarising, with tests

## 3. Templates

- [ ] 3.1 Template functions for the eight events; snapshot-free string tests including pickup pin, longest-order length limit and money format
- [ ] 3.2 Health registry entry `notifications` that reports `degraded` when production uses the console sender

## 4. Verify

- [ ] 4.1 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass; `openspec validate notifications --strict` passes
