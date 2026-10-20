# owner-availability Specification

## Purpose
Let the owner manage booking availability through capacity suggestions, manual date blocks and reopening, without changing existing orders.
## Requirements
### Requirement: Capacity suggestions list
`/owner/dates` SHALL list each capacity suggestion with the date, the confirmed order count, the number of unpaid or unverified orders for the date, and actions "Close date" and "Keep open". It SHALL show an empty state when there are none.

#### Scenario: Suggestion shown
- **WHEN** 14 Sep has 10 confirmed and 3 awaiting-verification orders
- **THEN** the list shows 14 Sep with "10 confirmed, 3 awaiting"

#### Scenario: Close from a suggestion
- **WHEN** the owner presses "Close date"
- **THEN** the date is closed with reason `capacity`, leaves the suggestions and appears in closed dates

#### Scenario: Keep open
- **WHEN** the owner presses "Keep open"
- **THEN** the date leaves the suggestions until another order is confirmed for it

### Requirement: Closed dates list and reopening
The screen SHALL list closed dates with their reason and note, and let the owner reopen each one.

#### Scenario: Reopen
- **WHEN** the owner reopens a manually blocked date
- **THEN** it disappears from the list and customers can book it

### Requirement: Manual blocking
The owner SHALL be able to block any date from today onward with an optional note of up to 200 characters. Blocking SHALL NOT change existing orders, and the screen SHALL say so when the date already has orders.

#### Scenario: Block a holiday
- **WHEN** the owner blocks 25 Dec with the note "Christmas"
- **THEN** the date is closed with reason `manual` and the note is shown

#### Scenario: Past date
- **WHEN** the owner tries to block yesterday
- **THEN** the picker does not allow it and the action rejects it with `DATE_IN_PAST`

#### Scenario: Date with orders
- **WHEN** the owner blocks a date that has 4 confirmed orders
- **THEN** a notice says the 4 existing orders stay as they are

### Requirement: Link to the day's orders
Every date on the screen SHALL link to `/owner/orders?date=<date>`.

#### Scenario: Follow a date
- **WHEN** the owner taps a suggestion's date
- **THEN** the orders list opens filtered to that date

### Requirement: Owner-only and sans font
All reads and actions SHALL call `requireOwner()`. The date picker on this screen SHALL render the month name in the sans font.

#### Scenario: Owner variant
- **WHEN** the block form's picker renders
- **THEN** the month name has the sans font class and not the display class
