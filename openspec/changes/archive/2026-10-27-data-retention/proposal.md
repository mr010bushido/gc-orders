## Why

The app keeps customer names, phone numbers, emails, addresses, photos and pasted payment messages. The agreed rules are: delete design images 90 days after the event, anonymise orders after 2 years, and tell customers on the form (PBS 7.9, Q40). Without a job and a privacy page, those rules are only intentions.

## What Changes

- Job `retention`, run daily: removes pending uploads older than 24 hours, deletes images 90 days after the event date, anonymises orders 2 years after the event date, and deletes notification-log rows older than 2 years. It is idempotent and works in batches.
- Anonymisation clears name, phone, email, delivery address, design notes, topper text, quote request description and all POP texts, and keeps reference, event date, lines, totals, statuses and timeline as business records.
- A `/privacy` page in plain language: what is collected, why, who handles it, how long it is kept and how to ask for deletion. The booking form's privacy note links to it.
- An owner action "Erase personal data" on completed or expired orders for a customer who asks sooner.
- A health check on the job's heartbeat, and ops files for the schedule.

Out of scope: legal advice, data export for customers, backups handling (VPS migration plan covers backup retention).

## Capabilities

### New Capabilities
- `data-retention`: the retention job, anonymisation, the privacy page, owner erasure and the health check.

### Modified Capabilities
None.

## Impact

- New: `lib/jobs/retention.ts`, `lib/orders/anonymise.ts`, `app/privacy/page.tsx`, owner action and button, `ops/` schedule files, tests.
- Owner: Codex for the job and anonymisation; Claude for the privacy page and the owner button. Depends on `image-uploads`, `order-expiry` (job pattern), `quote-requests`, `owner-orders`, `platform-portability`.
- A human reviews the privacy wording and confirms any legal obligations (see Open Questions in the design).
- Linear issue: created when the implementer is delegated.
