## Context

`order-lifecycle` made the personal columns nullable only when `anonymised_at` is set, and keeps POP text in `pop_submissions`. `image-uploads` stores images in a private bucket and rows in `order_images`. `notifications` logs masked recipients. Dates use the Africa/Lusaka calendar.

## Goals / Non-Goals

**Goals:**
- Personal data is removed on schedule without losing the business record (what was sold, when, for how much).
- A failed storage deletion is retried, never forgotten.

**Non-Goals:**
- Customer-initiated data export, legal registration or policy text beyond a clear plain-language page.

## Decisions

- **One job, four steps, daily at 00:00 UTC (02:00 Lusaka).** Each step takes at most 200 rows per run, so a large backlog clears over a few runs. Steps are independent: a failure in one is recorded and the others still run; the endpoint returns 500 so no heartbeat is recorded.
- **Storage first, row second.** For images, `ImageStore.delete(key)` runs before the row is deleted. `delete` is idempotent, so a crash between the two retries safely next run.
- **"Event date + N" in Lusaka time.** An image is due when `today(Lusaka) > event_date + 90 days`. An order is due when `today(Lusaka) > event_date + 2 years` (calendar years).
- **Anonymise in one update.** Set the personal columns to null, set `anonymised_at`, delete the order's `pop_submissions`, clear `quote_requests.description`, delete any remaining images. Reads treat an anonymised order as not found on the customer page and show "Anonymised" in the owner list.
- **Owner erasure uses the same function** and is limited to `completed` and `expired` orders, so an active order cannot be wiped by a mis-tap. The sheet asks for confirmation.
- **The privacy page is static content in the repository.** It reads the retention periods from constants shared with the job so the page cannot disagree with the behaviour.
- **Schedule** is documented in `ops/` like `order-expiry`: daily `pg_cron` for the pilot and a systemd timer later.

## Risks / Trade-offs

- [Wrong date arithmetic deletes too early] → Boundary tests on both sides of 90 days and 2 years, including leap days and the Lusaka midnight.
- [Backups keep deleted data] → Out of scope here; the VPS migration plan sets backup retention to match.
- [The policy wording is not reviewed] → A BLOCKED task for a human to review the page before go-live.

## Open Questions

- Whether the Zambia Data Protection Act 2021 requires the business to register or appoint someone, and what wording it needs. A human with the right advice must confirm; this change does not decide it.
