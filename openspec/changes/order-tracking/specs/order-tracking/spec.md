## ADDED Requirements

### Requirement: Private link access
The order page SHALL show an order only when the request carries a token whose hash matches the order. A missing or wrong token SHALL produce the same not-found response as an unknown reference. Order routes SHALL send `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.

#### Scenario: Valid link
- **WHEN** a visitor opens `/order/CAKE-2026-0042?t=<token>` with the right token
- **THEN** the order page is shown

#### Scenario: Guessed reference
- **WHEN** a visitor opens `/order/CAKE-2026-0043` with no token
- **THEN** the response is the generic not-found page and reveals nothing about whether the order exists

#### Scenario: Headers
- **WHEN** an order page is served
- **THEN** the response has `Cache-Control: no-store` and `Referrer-Policy: no-referrer`

### Requirement: Minimal data shown
The order page SHALL show the first name, items, totals, deposit and balance due, status, timeline and event details. It SHALL mask the phone and email (last three digits and the domain only) and SHALL NOT show the full address.

#### Scenario: Masked contact
- **WHEN** the order phone is `+260977123456`
- **THEN** the page shows `+260 ••• ••• 456`

### Requirement: Find my booking
`/order` SHALL accept a reference and a phone number. If they match an order, the system SHALL send the order link by SMS to the stored phone. The response SHALL be identical whether or not an order matched.

#### Scenario: Match
- **WHEN** the reference and phone match
- **THEN** an SMS with the private link is sent and the page says a link has been sent if the booking exists

#### Scenario: No match
- **WHEN** the phone does not match
- **THEN** no SMS is sent and the page shows the same message

#### Scenario: Phone written differently
- **WHEN** the phone is entered as `0977123456` and the stored number is `+260977123456`
- **THEN** it matches

### Requirement: Lookup rate limits
The system SHALL allow at most 5 lookups per client address and 3 per reference per hour and return `RATE_LIMITED` beyond that.

#### Scenario: Fourth lookup of one reference
- **WHEN** a reference is looked up 4 times within an hour
- **THEN** the fourth returns `RATE_LIMITED` and sends no SMS

### Requirement: Payment instructions and POP form
While an order is `awaiting_payment` the page SHALL show the deposit amount, both mobile money numbers, the reference to quote, the remaining time before expiry and a form to paste the confirmation SMS text. Submitting valid text SHALL call `submitPop` and show the awaiting-verification state.

#### Scenario: Paste POP
- **WHEN** the customer pastes a 120-character confirmation message and submits
- **THEN** the order becomes `awaiting_verification` and the page says the owner will verify it

#### Scenario: Too short
- **WHEN** the text is 4 characters
- **THEN** the form shows an error and the status is unchanged

#### Scenario: Flagged order
- **WHEN** the order is flagged
- **THEN** the page tells the customer the owner will be in touch and offers the POP form again

### Requirement: Notifications on POP
Submitting POP SHALL send the customer a "POP received" message and the owner a "POP submitted" alert through `notify`, and a send failure SHALL NOT fail the submission.

#### Scenario: Owner alerted
- **WHEN** a customer submits POP
- **THEN** the owner alert is sent or its failure is logged, and the customer still sees the awaiting-verification state

### Requirement: Status copy
The page SHALL show distinct content for `awaiting_quote`, `awaiting_payment`, `awaiting_verification`, `confirmed` (with the pickup map link for pickup orders), `completed` and `expired`, and SHALL use `effectiveStatus`.

#### Scenario: Lapsed but job not run
- **WHEN** the stored status is `awaiting_payment` and the deadline passed
- **THEN** the page shows the expired state and refuses POP with an explanation to rebook

#### Scenario: Confirmed pickup
- **WHEN** a pickup order is `confirmed`
- **THEN** the page shows the Google Maps pin link from settings

### Requirement: Accessibility and design
The page SHALL use shared components and tokens, one display-font moment, and announce POP success or failure to assistive technology.

#### Scenario: Success announced
- **WHEN** POP submission succeeds
- **THEN** the confirmation message is in a live region
