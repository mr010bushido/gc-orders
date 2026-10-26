# quote-requests Specification

## Purpose
Custom cakes that cannot be priced by formula are booked as quote requests: the customer describes the cake and adds photos, the owner prices it, and the order then follows the usual deposit, proof-of-payment and verification path.
## Requirements
### Requirement: Submitting a quote request
A booking request MAY include a quote request with a kind (`character_cake`, `wedding_cake`, `toppings` or `other`) and a description of 10 to 2,000 characters, with or without priced items. A request with a quote request SHALL count as a non-empty basket. Up to 3 image attach tokens MAY accompany it.

#### Scenario: Quote only
- **WHEN** a request has no cake, no desserts and a wedding-cake quote request
- **THEN** an order is created in `awaiting_quote` with a reference and total K0

#### Scenario: Quote with a priced cake
- **WHEN** a request has a classic 8" cake booked ahead and a toppings quote request
- **THEN** the order is `awaiting_quote`, the cake line is stored at K1,040 and the total is K1,040

#### Scenario: Description too short
- **WHEN** the description is 4 characters
- **THEN** the response contains `quoteDescription: REQUIRED` and no order is created

### Requirement: No deposit shown before a quote
For an order in `awaiting_quote`, the app SHALL NOT show payment instructions or a deposit amount, and the order page SHALL say the owner is pricing the request.

#### Scenario: Order page while waiting
- **WHEN** the customer opens an `awaiting_quote` order
- **THEN** the page shows their request and no payment numbers

### Requirement: Notifications for requests
On submission the customer SHALL receive a "request received" SMS and email with the reference and order link, and the owner SHALL receive a new-quote-request SMS and email.

#### Scenario: Both sent
- **WHEN** a quote request is submitted
- **THEN** the customer message states that no payment is due yet and the owner alert names the reference

### Requirement: Owner prices and sends a quote
For an `awaiting_quote` order the owner SHALL be able to enter 1 to 5 quote lines, each with a label and a whole-Kwacha amount of at least 1, see the resulting total and deposit, and send the quote. Sending SHALL, in one transaction, append the lines, recompute the total and 50% deposit with `priceBasket`, move the order to `awaiting_payment` and set the payment deadline to now plus the expiry setting.

#### Scenario: Quote a wedding cake
- **WHEN** the owner sends one line "Wedding cake, 3 tier" for K6,000 on a quote-only order
- **THEN** the total is K6,000, the deposit is K3,000, the status is `awaiting_payment` and the deadline is 24 hours away

#### Scenario: Priced item plus quote
- **WHEN** the order already has a K1,040 cake line and the owner adds a K500 quote line
- **THEN** the total is K1,540 and the deposit is K770

#### Scenario: No lines
- **WHEN** the owner tries to send with no lines
- **THEN** it is rejected with `QUOTE_LINES_REQUIRED`

#### Scenario: Invalid amount
- **WHEN** a line amount is 0 or 12.5
- **THEN** it is rejected with `INVALID_QUOTE_LINE`

#### Scenario: Sent twice
- **WHEN** the owner sends a quote for an order that is already `awaiting_payment`
- **THEN** it fails with `INVALID_TRANSITION` and the lines are unchanged

### Requirement: Quote ready notice
After a quote is sent the customer SHALL receive an SMS and email with the new deposit and a link to the order page.

#### Scenario: Customer told
- **WHEN** a quote is sent
- **THEN** one SMS and one email are sent, and a provider failure does not undo the quote

### Requirement: Payment follows the normal path
After the quote is sent the order page SHALL show the quote lines, total, deposit, payment instructions, the expiry countdown and the POP form. If no POP arrives within 24 hours of sending, the order SHALL expire like any other.

#### Scenario: Quote ignored
- **WHEN** a quote was sent 25 hours ago and no POP was submitted
- **THEN** the order is `expired`

### Requirement: Decline a request
The owner SHALL be able to decline an `awaiting_quote` order, moving it to `expired` with actor `owner`, without sending a message.

#### Scenario: Decline
- **WHEN** the owner declines a request
- **THEN** the order is `expired` and no notification is sent

### Requirement: Owner sees the request
The owner sheet for an `awaiting_quote` order SHALL show the kind, description and photos, and the list SHALL show the Awaiting quote pill and a summary naming the kind.

#### Scenario: List summary
- **WHEN** a wedding-cake request is listed
- **THEN** the card summary reads "Quote: Wedding cake"

### Requirement: Awaiting quote pill
The shared status pill SHALL support `awaiting_quote` with the gold-wash background and gold-ink text and the label "Awaiting quote", and `design/DESIGN.md` SHALL list it.

#### Scenario: Pill renders
- **WHEN** the pill is rendered with `awaiting_quote`
- **THEN** it shows "Awaiting quote" with the gold-wash tokens

