## Why

Customers and the owner must be told at key steps by SMS and email (PRD §2, §6; PBS D1, D2, Q10). SMS goes through Twilio now and a cheaper local provider later, so senders must sit behind interfaces. Every message sent must be logged so the owner can see what happened.

## What Changes

- Add `SmsSender` and `EmailSender` interfaces with Twilio and Resend implementations, and a console implementation for development and tests.
- Add templates for each message and a `notify(event, order)` function that picks recipients and channels.
- Add a `notification_log` table: channel, recipient (masked), template, order, status, provider message id, error, time.
- Customer messages: booking received (reference, payment instructions, order link; pickup pin for pickup), POP received, deposit verified (pickup pin), quote ready (deposit link), expiry notice (SMS only).
- Owner messages: new booking, new quote request, POP submitted (SMS and email).
- Failures never block the action that triggered them: they are logged and retried once by the expiry job's tick or recorded for the owner to see.

Out of scope: owner-visible log screens, inbound SMS (Zambia is outbound only), WhatsApp.

## Capabilities

### New Capabilities
- `notifications`: sender interfaces, providers, templates, triggers, recipients, logging and failure behaviour.

### Modified Capabilities
None.

## Impact

- New: `lib/notify/*`, `lib/db/schema/notifications.ts`, migration, tests.
- New dependencies: `twilio` (or its REST API through `fetch`), `resend`.
- New environment variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, `RESEND_API_KEY`, `EMAIL_FROM`. Credentials come from the owner and are set by a human.
- Owner: Codex. Depends on `order-lifecycle` only. It sends nothing by itself: `booking-flow`, `order-tracking`, `owner-orders`, `order-expiry` and `quote-requests` each call `notify` for their own events.
- Linear issue: created when the implementer is delegated.
