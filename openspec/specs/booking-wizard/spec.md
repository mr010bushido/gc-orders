# booking-wizard Specification

## Purpose
The customer-facing booking flow: the landing page, the step-by-step wizard that collects items, cake details, delivery and contact details, and the review, submission and confirmation screens.
## Requirements
### Requirement: Landing page
The home page SHALL show the logo, one display-font headline, one primary "Book a Cake" button leading to `/book`, and a secondary ghost-style "Find my booking" link leading to `/order`.

#### Scenario: Start booking
- **WHEN** a visitor presses "Book a Cake"
- **THEN** the wizard opens at step 1

#### Scenario: Find an existing booking
- **WHEN** a visitor presses "Find my booking"
- **THEN** the find-my-booking page at `/order` opens

### Requirement: Steps and stepper
The wizard SHALL have the steps Choose items, Cake details (for a price-list cake) or Wedding details (for a wedding cake), Delivery and details, and Review. When the basket has neither cake choice, the second step SHALL be skipped and the stepper SHALL show three steps. On step 1 the stepper SHALL read "Step 1 · Choose items" without a total, because the total is not yet known; from step 2 on it SHALL read "Step N of M · Name". Each step SHALL be reachable with Back and Next without losing entered data.

#### Scenario: Dessert-only basket
- **WHEN** the visitor selects only desserts
- **THEN** the stepper reads "Step 2 of 3 · Delivery and details" after Next

#### Scenario: No total on step 1
- **WHEN** the wizard opens
- **THEN** the stepper reads "Step 1 · Choose items" and shows no "of N"

#### Scenario: Back keeps data
- **WHEN** the visitor goes back from step 3 to step 1 and forward again
- **THEN** every earlier answer is still filled in

### Requirement: Choose items
Step 1 SHALL offer three choices as labelled choice cards: "Cake from our price list", "Wedding cake" and "Desserts". The two cake choices SHALL be mutually exclusive; Desserts SHALL combine with either or stand alone. Choosing a price-list cake SHALL let the visitor pick one flavour from the active flavours grouped by price and one frosting. Choosing Desserts SHALL let the visitor add any number of dessert lines (type, quantity of at least 30, optional flavour note). Diet-specific flavours SHALL be labelled. There SHALL be no separate "request a quote" option on this step. Next SHALL be disabled until a choice is made and each line is valid.

#### Scenario: Under the minimum
- **WHEN** a dessert quantity of 12 is entered
- **THEN** an inline error says the minimum is 30 and Next is disabled

#### Scenario: Cake choices are exclusive
- **WHEN** the visitor has chosen "Cake from our price list" and then chooses "Wedding cake"
- **THEN** the price-list cake is deselected and its flavour and frosting are no longer submitted

#### Scenario: Desserts with a wedding cake
- **WHEN** the visitor chooses "Wedding cake" and "Desserts" with a valid dessert line
- **THEN** Next is enabled and the order carries both

### Requirement: Cake details
The cake step SHALL let the visitor pick 1 to the maximum number of tiers, each with a size, choose add-ons, enter design notes and, when the message topper is chosen, the topper text. The running price SHALL update as choices change. A "Customise this cake" toggle SHALL reveal a request type (character cake, toppings or other), a description of at least 10 characters and up to 3 reference photos; turning it off SHALL remove the quote request. When customised, the review SHALL label the priced cake total "Base price (price list)" and SHALL state that no deposit is due until the quote is sent.

#### Scenario: Tier limit
- **WHEN** the maximum tiers setting is 3
- **THEN** the "Add tier" control is not offered after the third tier

#### Scenario: Customised cake submitted
- **WHEN** the visitor customises an 8" classic cake with a toppings description and submits
- **THEN** the order is `awaiting_quote` with the cake line as the base price

#### Scenario: Customise turned off
- **WHEN** the visitor turns the toggle on, types a description, then turns it off and submits
- **THEN** no quote request is sent and the order is `awaiting_payment`

### Requirement: Delivery, date and contact
The details step SHALL offer pickup or delivery as radio cards, require an address for delivery, show the pickup map link for pickup, and offer a date picker, a time window and the contact fields. The picker SHALL start at the earliest date for the basket, mark short-notice days with the warning style and show closed dates as unavailable. A rush banner with `role="alert"` SHALL appear when the chosen date carries the cake rush fee.

#### Scenario: Rush date chosen
- **WHEN** the visitor picks a date less than 48 hours away for a cake
- **THEN** a warning banner states the 20% rush fee on the cake and the price updates

#### Scenario: Closed date
- **WHEN** a date is closed
- **THEN** it cannot be selected and is announced as unavailable to screen readers

### Requirement: Review and submit
The review step SHALL show the summary card with every line, the total in the display font and the 50% deposit, the privacy note, and one primary "Submit booking" button. Submitting SHALL disable the button until the response arrives.

#### Scenario: Double tap
- **WHEN** the visitor taps submit twice quickly
- **THEN** only one booking is created

#### Scenario: Server error shown
- **WHEN** the server returns `DATE_UNAVAILABLE`
- **THEN** the wizard returns to the details step with the date field marked in error

### Requirement: Confirmation screen
After success the app SHALL show the booking reference, server-priced lines, total and deposit, and the payment instructions (Airtel and MTN numbers, "quote your reference"), with a primary button to continue to `/order/<reference>?t=<accessToken>`. The access token SHALL remain in the response for the order-tracking hand-off. If the server total differs from the reviewed total, the confirmation SHALL explain that the price was updated.

#### Scenario: Continue to private order page
- **WHEN** a booking succeeds and the customer selects Continue
- **THEN** the app opens `/order/<reference>?t=<accessToken>`

#### Scenario: Continue link carries issued credentials
- **WHEN** the confirmation is rendered with a reference and access token
- **THEN** Continue links to `/order/<encoded-reference>?t=<encoded-access-token>`

### Requirement: Design and accessibility rules
The screens SHALL use only design tokens and the shared components, have one display-font moment per screen, inputs of 48px with visible labels, touch targets of at least 44px, and move focus to the first error on a failed submit.

#### Scenario: Focus on error
- **WHEN** submit fails with two field errors
- **THEN** focus moves to the first invalid field and the errors are announced

### Requirement: Draft survives refresh
The wizard SHALL keep answers in session storage and restore them after a refresh, and SHALL clear them after a successful booking.

#### Scenario: Refresh on step 3
- **WHEN** the page is reloaded on step 3
- **THEN** earlier answers are restored

### Requirement: Wedding details
When the visitor chooses "Wedding cake", the second step SHALL be Wedding details: a description of 10 to 2,000 characters, with helper text prompting for guest count, number of tiers, theme or colours, and flowers, and up to 3 reference photos. No price SHALL be shown for the wedding cake. Submission SHALL send a `wedding_cake` quote request with no priced cake. The review and confirmation SHALL state that the owner will send a quote and no deposit is due yet.

#### Scenario: Wedding order submitted
- **WHEN** the visitor completes Wedding details with a 40-character description and submits
- **THEN** an order is created in `awaiting_quote` with total K0, and the confirmation shows no payment numbers

#### Scenario: Description too short
- **WHEN** the description is 5 characters
- **THEN** an inline error asks for at least 10 characters and Next is disabled

