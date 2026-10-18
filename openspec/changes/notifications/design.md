## Context

Twilio to Zambia costs roughly $0.30 to $0.43 per message and is outbound only. A local aggregator or MTN/Airtel bulk SMS is the planned swap, so the sender must be replaceable in one place. Resend also provides SMTP for Supabase Auth magic links; that is `owner-auth`'s concern, not this change's.

## Goals / Non-Goals

**Goals:**
- Swap SMS provider by changing one factory.
- A message that fails to send never loses the booking or the status change.
- Predictable SMS count and short messages.

**Non-Goals:**
- Queues, automatic retries, delivery receipts, templating engines. There is no automatic retry in v1: a failed send is logged as `failed` with a summarised error and is visible to the owner. An owner-triggered resend that issues a fresh order link is follow-up work for `owner-orders`, because the plaintext order token is never stored.

## Decisions

- **Plain interfaces.** `SmsSender.send({ to, text }) → { id }` and `EmailSender.send({ to, subject, text, html }) → { id }`. A factory reads the environment and returns Twilio, Resend or the console sender. The console sender is the default when credentials are missing, so development and previews never send real messages and never fail for want of keys.
- **Twilio through `fetch`.** The REST call is one request; avoiding the SDK keeps the bundle small and the dependency list short. Resend likewise via its HTTP API unless the SDK is needed.
- **Templates are functions.** `(order, ctx) → { sms, subject, text, html }` as TypeScript, unit-tested as strings. SMS text is plain, under 320 characters (two segments), no emoji. Money formatted `K1,300`. The order link includes the token (available only at creation or via find-my-booking).
- **Events, not call sites.** `notify('booking_received', { order, token })`. Event names: `booking_received`, `pop_received`, `deposit_verified`, `quote_ready`, `order_expired`, `owner_new_booking`, `owner_new_quote_request`, `owner_pop_submitted`. A table maps each event to recipients and channels, per PBS D1, D2 and Q10.
- **Never block, always log.** `notify` catches provider errors, writes a failed log row and returns. The triggering action does not wait on the log write beyond the same request.
- **Owner recipient.** Alert phone from the `owner alert phone` setting; alert email from `OWNER_EMAIL`. If either is missing, that channel is skipped and logged as `skipped`.
- **Masking.** The log stores the phone with the middle digits masked and the email domain only, to keep personal data out of an operational table.
- **Idempotence.** A unique key `(order_id, event, channel)` stops a retried request from sending twice; `order_expired` and `deposit_verified` send once per order.

## Risks / Trade-offs

- [SMS cost] → Three to four per booking as in the PRD; the log table lets the owner count them.
- [Provider outage loses a message] → The failed row is visible; the owner can contact the customer from the order page.
- [Secrets in logs] → The senders never log request bodies or headers.
- [Console sender hides misconfiguration in production] → The health registry gets a `notifications` check that reports `degraded` when production runs the console sender or has no order-link origin.
