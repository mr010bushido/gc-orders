# date-availability Specification

## Purpose
TBD - created by archiving change date-availability. Update Purpose after archive.
## Requirements
### Requirement: Closed dates
The system SHALL treat a date as closed to new bookings when `date_decisions` has a `closed` row for it, and SHALL return the closed dates in a range.

#### Scenario: Manual block
- **WHEN** the owner closes 25 Dec with reason `manual` and a note
- **THEN** `isDateOpen("2026-12-25")` is false and the date appears in `getClosedDates`

#### Scenario: Reopen
- **WHEN** the owner opens a closed date
- **THEN** the row is removed and the date is open again

### Requirement: Capacity suggestions
The system SHALL suggest closing a date once its count of `confirmed` and `completed` orders reaches the capacity setting (default 10), counting only dates today or later. It SHALL NOT close the date automatically.

#### Scenario: Ten confirmed orders
- **WHEN** 10 orders for 14 Sep are `confirmed`
- **THEN** 14 Sep is in the suggestions and still open to bookings

#### Scenario: Unverified orders do not count
- **WHEN** 9 orders are `confirmed` and 5 are `awaiting_verification` for one date
- **THEN** the date is not suggested

#### Scenario: Changed capacity
- **WHEN** the capacity setting is 6 and 6 orders are confirmed
- **THEN** the date is suggested

### Requirement: Owner decisions on suggestions
The owner SHALL be able to confirm a suggestion, which closes the date with reason `capacity`, or override it, which records the date as kept open with the current count. A kept-open date SHALL be suggested again only when its confirmed count exceeds the recorded count.

#### Scenario: Override then another order
- **WHEN** the owner keeps a date open at 10 confirmed orders and an 11th order is confirmed
- **THEN** the date is suggested again

#### Scenario: Override and no change
- **WHEN** the owner keeps a date open at 10 and no further orders are confirmed
- **THEN** the date is not suggested

### Requirement: Submission re-check
The booking path SHALL re-check the event date inside the order transaction and refuse a closed date with `DATE_UNAVAILABLE`.

#### Scenario: Closed after the form loaded
- **WHEN** the owner closes a date after a customer opened the form and the customer then submits for that date
- **THEN** no order is created and the error is `DATE_UNAVAILABLE`

### Requirement: Existing orders unaffected
Closing a date SHALL NOT change any existing order for that date.

#### Scenario: Close a busy date
- **WHEN** the owner closes a date that has 4 confirmed orders
- **THEN** those orders keep their status and date

