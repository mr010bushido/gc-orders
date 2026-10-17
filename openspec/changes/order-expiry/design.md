## Context

`order-lifecycle` stores `payment_due_at` for `awaiting_payment` orders and provides `effectiveStatus` and the `expire` transition. `platform-portability` defines the job endpoint, its secret and idempotent handlers. The scheduler (`pg_cron` now, a systemd timer later) is not the app's concern. Only confirmed and completed orders count toward date capacity (`date-availability`), so an expired order frees nothing that was held.

## Goals / Non-Goals

**Goals:**
- Expired orders become `expired` in the database within about 15 minutes of the deadline, and the customer is told once.
- A missed run is visible.

**Non-Goals:**
- Reminders before expiry, retries beyond the next run, a queue.

## Decisions

- **Select, then compare-and-set.** The handler selects up to 100 ids where `status = 'awaiting_payment' and payment_due_at <= now`, then expires each through the lifecycle transition, which only succeeds if the status is still `awaiting_payment`. An order paid between the select and the update is untouched, and a second overlapping run writes nothing.
- **Notify after each success.** `notify('order_expired')` runs only for rows this run actually expired; the `(order, event, channel)` uniqueness in the log is a second guard against double texts.
- **Time comes from the database call site, not `Date.now()` inside the lifecycle.** The handler takes `now` as a parameter, defaulting to the current time, so tests control it.
- **Flagged orders are untouched** because they are `awaiting_verification`, not `awaiting_payment`.
- **Heartbeat check threshold is 45 minutes** (three missed 15-minute runs). In non-production environments the check always passes, because previews have no scheduler.
- **Ops files are plain text in `ops/`.** The pg_cron SQL uses `pg_net`'s `net.http_post` with the bearer secret supplied as a placeholder; a human substitutes the real value and runs it in the Supabase SQL editor. It is deliberately outside `drizzle/` because it names Supabase extensions and a secret. The portability checker does not scan `ops/`.

## Risks / Trade-offs

- [The scheduler is never installed] → The heartbeat health check fails and the sentinel or owner sees it; lazy reads keep customers from paying an expired order in the meantime.
- [`pg_cron` fires while the app is cold] → The first request pays the cold start; the 15-minute cadence tolerates it.
- [Secret in the cron SQL] → Stored in Supabase `vault` or substituted by the human; never committed.
