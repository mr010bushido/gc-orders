## ADDED Requirements

### Requirement: Order creation stores a price snapshot
`createOrder` SHALL store the customer details, fulfilment, event date, time window and notes, the priced basket's lines, the total and the deposit in one transaction. The stored lines SHALL NOT change when the catalogue changes. A delivery order SHALL have an address.

#### Scenario: Snapshot survives a price change
- **WHEN** an order is created for a classic 8" cake at K1,040 and the classic base price is then raised
- **THEN** reading the order still shows the cake line at K1,040 and the original total

#### Scenario: Delivery without address
- **WHEN** an order is created with fulfilment `delivery` and no address
- **THEN** creation is rejected and nothing is stored

#### Scenario: Atomic creation
- **WHEN** storing the lines fails after the order row is written
- **THEN** no order, line, event or reference number remains

### Requirement: Initial status
A fully priced order SHALL start as `awaiting_payment` with a payment deadline equal to its creation time plus the payment expiry setting. An order that requests a quote SHALL start as `awaiting_quote` with no deadline.

#### Scenario: Priced order
- **WHEN** a priced order is created at 10:00 and expiry is 24 hours
- **THEN** its status is `awaiting_payment` and its deadline is 10:00 the next day

### Requirement: Legal status transitions
The system SHALL allow only these transitions: `awaiting_quote` to `awaiting_payment` (send quote, owner), `awaiting_payment` to `awaiting_verification` (submit POP, customer), `awaiting_verification` to `confirmed` (verify, owner), `confirmed` to `completed` (complete, owner), `awaiting_payment` to `expired` (expire, system) and `awaiting_quote` to `expired` (decline, owner). Any other transition SHALL fail with `INVALID_TRANSITION` and change nothing.

#### Scenario: Skipping verification
- **WHEN** the owner completes an order that is `awaiting_verification`
- **THEN** the call fails with `INVALID_TRANSITION`

#### Scenario: Concurrent verify
- **WHEN** two verify calls run at the same time on one order
- **THEN** exactly one succeeds and one status event is written

#### Scenario: Decline a quote request
- **WHEN** the owner declines an `awaiting_quote` order
- **THEN** it becomes `expired` with actor `owner`

#### Scenario: Expired is final
- **WHEN** a customer submits POP for an expired order
- **THEN** the call fails with `ORDER_EXPIRED`

### Requirement: Status timeline
Every transition, and order creation, SHALL write an event with the previous status, the new status, the actor (`owner`, `system` or `customer`) and the time. The timeline SHALL be readable in order.

#### Scenario: Timeline after verification
- **WHEN** an order is created, a POP is submitted and the owner verifies it
- **THEN** the timeline lists three events with actors `system`, `customer` and `owner` in time order

### Requirement: Proof of payment
Submitting POP SHALL store the trimmed text (10 to 2,000 characters) with a timestamp and move an `awaiting_payment` order to `awaiting_verification`. While an order is flagged, further POP text SHALL be stored without a status change.

#### Scenario: Too short
- **WHEN** the submitted text is 4 characters
- **THEN** it is rejected with `POP_TEXT_INVALID` and the status is unchanged

#### Scenario: Resubmission while flagged
- **WHEN** a flagged order receives a second POP text
- **THEN** both submissions are kept, the latest is returned as current, and the status stays `awaiting_verification`

### Requirement: Flag
The owner SHALL be able to flag an order in `awaiting_verification` with a note, and clear the flag. A flag SHALL NOT change the status. Verifying a flagged order SHALL clear the flag and keep the note.

#### Scenario: Flag outside verification
- **WHEN** the owner flags a `confirmed` order
- **THEN** the call fails with `INVALID_TRANSITION`

### Requirement: Effective status
`effectiveStatus(order, now)` SHALL return `expired` for an `awaiting_payment` order whose deadline has passed, and the stored status otherwise.

#### Scenario: Job has not run yet
- **WHEN** an order's deadline passed 5 minutes ago and its stored status is still `awaiting_payment`
- **THEN** `effectiveStatus` returns `expired`

#### Scenario: Flagged order never lapses
- **WHEN** a flagged `awaiting_verification` order is 3 days old
- **THEN** `effectiveStatus` returns `awaiting_verification`

### Requirement: Balance
The system SHALL track the balance as total minus deposit. The owner SHALL be able to record it paid once, with a method (airtel, mtn, cash, bank, other) and an optional note, on a `confirmed` or `completed` order. Completing an order with an unpaid balance SHALL succeed and report `balanceUnpaid: true`.

#### Scenario: Record balance
- **WHEN** the owner records the balance paid by cash on a confirmed order
- **THEN** the order stores the time, method and note, and balance due shows K0

#### Scenario: Paid twice
- **WHEN** the balance is recorded a second time
- **THEN** the call fails with `BALANCE_ALREADY_PAID`

#### Scenario: Complete with balance due
- **WHEN** the owner completes a confirmed order whose balance is unpaid
- **THEN** the order becomes `completed` and the result has `balanceUnpaid: true`

### Requirement: Owner-seen marker
An order SHALL carry `owner_seen_at`, null until the owner opens it. An order is "new" while it is null.

#### Scenario: Opening marks seen
- **WHEN** the owner marks an order seen
- **THEN** `owner_seen_at` is set once and later calls do not change it

### Requirement: Personal data can be cleared in one update
Name, phone, email, delivery address, design notes and topper text SHALL be nullable on `orders` only when `anonymised_at` is set, enforced by a check constraint. POP submission text SHALL be stored only in `pop_submissions`.

#### Scenario: Active order missing a phone
- **WHEN** an order without `anonymised_at` is written with no phone
- **THEN** the database rejects it

#### Scenario: Anonymised order
- **WHEN** `anonymised_at` is set and the personal columns are null
- **THEN** the write succeeds and reference, event date, lines, totals and timeline remain readable

### Requirement: Customer access token
`createOrder` SHALL return a random token once and store only its hash. Looking an order up by token SHALL compare hashes.

#### Scenario: Token not stored
- **WHEN** an order is created
- **THEN** the database contains no column holding the plaintext token

#### Scenario: Wrong token
- **WHEN** an order is looked up with an incorrect token
- **THEN** no order is returned
