## ADDED Requirements

### Requirement: Order list
`/owner/orders` SHALL list orders as order cards showing reference and date, status pill, customer and cake or dessert summary, fulfilment and total. The default view SHALL show orders that are `awaiting_quote`, `awaiting_payment`, `awaiting_verification` or `confirmed`, sorted by event date ascending, and SHALL use `effectiveStatus`.

#### Scenario: Default view
- **WHEN** the owner opens the page
- **THEN** completed and expired orders are hidden and the soonest event date is first

#### Scenario: Lapsed order
- **WHEN** an unpaid order is past its deadline but the job has not run
- **THEN** it shows an Expired pill and is absent from the default view

### Requirement: Filters and sorting
The list SHALL offer a chip for each status, a Flagged chip and All, a sort by event date ascending or descending, and a filter by event date. The state SHALL be held in the URL.

#### Scenario: Status chip
- **WHEN** the owner selects the Awaiting verification chip
- **THEN** only orders with that effective status are listed and the URL records it

#### Scenario: Date filter
- **WHEN** the URL has `date=2026-09-14`
- **THEN** every order for that date is listed regardless of status

### Requirement: New highlight
Orders the owner has not opened (`owner_seen_at` null) SHALL be marked New. Opening the order SHALL mark it seen.

#### Scenario: Open a new order
- **WHEN** the owner opens an unseen order
- **THEN** it stops showing as New on the next load

### Requirement: Order detail
The detail sheet SHALL show the reference, status pill and flag badge, the customer's name, phone and email, fulfilment with address, event date and time window, design notes and topper text, every priced line, total, deposit and balance due, the latest pasted POP text with earlier submissions, and the status timeline with times and actors. POP and notes SHALL be rendered as plain text.

#### Scenario: HTML in POP text
- **WHEN** the POP text contains `<script>`
- **THEN** it is displayed as literal text

#### Scenario: Deep link
- **WHEN** the owner opens `/owner/orders?order=CAKE-2026-0042`
- **THEN** the list loads with that order's sheet open

### Requirement: Contact buttons
The detail SHALL provide a tap-to-call `tel:` link and a WhatsApp `wa.me` link built from the stored `+260` number.

#### Scenario: Links
- **WHEN** the phone is `+260977123456`
- **THEN** the call link is `tel:+260977123456` and the WhatsApp link is `https://wa.me/260977123456`

### Requirement: Verify
For an order in `awaiting_verification` the owner SHALL be able to verify it in one action after seeing the expected deposit and reference. The action SHALL move the order to `confirmed` with actor `owner` and send the customer's confirmation through `notify`.

#### Scenario: Verify
- **WHEN** the owner verifies a K1,325 deposit order
- **THEN** it becomes `confirmed`, the timeline gains an owner event and the customer notification is attempted

#### Scenario: Two tabs
- **WHEN** the order was already verified in another tab and the owner verifies again
- **THEN** no second event is written and the sheet shows the current state

### Requirement: Flag and clear
The owner SHALL be able to flag an order in `awaiting_verification` with a required note, and clear the flag. A flagged order SHALL show a Flagged badge and keep its status.

#### Scenario: Flag without note
- **WHEN** the owner submits a flag with an empty note
- **THEN** the action is rejected with `NOTE_REQUIRED`

### Requirement: Complete and balance
The owner SHALL be able to mark a `confirmed` order completed. If the balance is unpaid the sheet SHALL warn first, and the action SHALL still succeed when the owner proceeds. The owner SHALL be able to record the balance paid with a method and optional note.

#### Scenario: Unpaid balance warning
- **WHEN** the owner marks an order with balance due completed
- **THEN** a warning shows the amount due and completion proceeds only after confirming

#### Scenario: Record balance
- **WHEN** the owner records the balance paid by cash
- **THEN** balance due shows K0 and the method is stored

### Requirement: Owner-only access
All reads and actions SHALL require the owner session through `requireOwner()`.

#### Scenario: No session
- **WHEN** a verify action is called without a session
- **THEN** it returns unauthorised and the order is unchanged

### Requirement: Design rules
The screens SHALL use the sans font only, one filled primary button per sheet, status pills from the shared component, and the selected order card style.

#### Scenario: Single primary
- **WHEN** the sheet is open for an order awaiting verification
- **THEN** exactly one filled brick button is present
