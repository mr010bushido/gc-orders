## Context

Orders arrive in volumes the owner can read on a phone. The owner reconciles POP text against a mobile money statement by amount and reference, then verifies. `order-lifecycle` already enforces every legal transition; this change only calls it with actor `owner`.

## Goals / Non-Goals

**Goals:**
- Verify an order in two taps from the list.
- Never show a status that disagrees with `effectiveStatus`.

**Non-Goals:**
- Search, pagination beyond a simple limit, exports, editing orders.

## Decisions

- **Default view is "Active".** Orders in `awaiting_quote`, `awaiting_payment`, `awaiting_verification` and `confirmed`, soonest event date first. Chips switch to a single status, Flagged, or All. The default is not in the PBS; it favours the owner's daily need (what is due and what needs checking) and is easy to change.
- **State in the URL.** `?status=…&sort=…&date=…&order=…`, so refresh and sharing work and the sheet can be deep-linked. Server components read it.
- **List limit 100, newest event first within the filter, "Load more" by cursor.** Volume is low; keep it simple.
- **Actions are server actions that call `requireOwner()`, then the lifecycle functions with actor `owner`.** They return a result type the sheet turns into messages. `revalidatePath` refreshes the list.
- **Verify asks to confirm.** The sheet shows the expected deposit and the reference next to the POP text, and the primary button reads "Verify K1,325 deposit". One filled button per sheet: Verify when awaiting verification, otherwise the main action for that status (Mark completed for confirmed).
- **Tap-to-call and WhatsApp.** `tel:+260…` and `https://wa.me/260…` (digits only), built from the stored E.164 number. WhatsApp opens with a short prefilled message naming the reference.
- **Seen marker on open.** Opening the sheet calls `markSeen` once. New highlight uses `owner_seen_at is null`.
- **Pending orders on a date are visible.** The `date` filter shows every status for that date, so the dates screen can link to it.

## Risks / Trade-offs

- [Owner verifies the wrong order] → The confirmation names the amount and reference, and the timeline records the actor and time.
- [Stale list after another tab acts] → Actions use compare-and-set; a failed transition shows "This order changed, refreshing".
- [Raw POP text shown in HTML] → Rendered as plain text, never as HTML.
