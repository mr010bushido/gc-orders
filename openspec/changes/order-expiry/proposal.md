## Why

If no proof of payment arrives within 24 hours of a booking, the order must expire and the customer must be told (PRD §6 item 6; PBS 4.2, Q29, Q35, Q10). Reads already treat a lapsed order as expired (`effectiveStatus`); this change makes it true in the database and sends the notice.

## What Changes

- Register the job `expire-orders` with the `/api/jobs/<name>` endpoint from `platform-portability`. It finds `awaiting_payment` orders past their deadline, expires them (actor `system`) and sends the customer one SMS. At most 100 orders per run; running twice is safe.
- Add a health check that reports failure when the `expire-orders` heartbeat is older than 45 minutes in production.
- Add the scheduler setup as documented ops files, not application code: the `pg_cron` SQL for the pilot (every 15 minutes, with the bearer secret) and a systemd timer and curl example for the VPS.

Out of scope: quote-request expiry (the clock only starts when a quote is sent, and then the same job applies), retention jobs (`data-retention`).

## Capabilities

### New Capabilities
- `order-expiry`: the expiry job, its idempotence and notices, and the heartbeat health check.

### Modified Capabilities
None.

## Impact

- New: `lib/jobs/expire-orders.ts`, registration, health check, `ops/pg_cron/expire-orders.sql`, `ops/systemd/` examples, tests.
- Owner: Codex. Depends on `order-lifecycle`, `notifications` and `platform-portability`. A human installs the schedule.
- Linear issue: created when the implementer is delegated.
