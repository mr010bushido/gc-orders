## ADDED Requirements

### Requirement: Landing page
The home page SHALL show the logo, one display-font headline and one primary "Book a Cake" button leading to `/book`.

#### Scenario: Start booking
- **WHEN** a visitor presses "Book a Cake"
- **THEN** the wizard opens at step 1

### Requirement: Steps and stepper
The wizard SHALL have the steps Choose items, Cake details, Delivery and details, and Review. When the basket has no cake, the Cake details step SHALL be skipped and the stepper SHALL show three steps. Each step SHALL be reachable with Back and Next without losing entered data.

#### Scenario: Dessert-only basket
- **WHEN** the visitor selects only desserts
- **THEN** the stepper reads "Step 2 of 3 · Delivery and details" after Next

#### Scenario: Back keeps data
- **WHEN** the visitor goes back from step 3 to step 1 and forward again
- **THEN** every earlier answer is still filled in

### Requirement: Choose items
Step 1 SHALL let the visitor add a cake (one flavour from the active flavours grouped by price, one frosting) and any number of dessert lines (type, quantity of at least 30, optional flavour note). Diet-specific flavours SHALL be labelled. Next SHALL be disabled until the basket has an item and each line is valid.

#### Scenario: Under the minimum
- **WHEN** a dessert quantity of 12 is entered
- **THEN** an inline error says the minimum is 30 and Next is disabled

### Requirement: Cake details
The cake step SHALL let the visitor pick 1 to the maximum number of tiers, each with a size, choose add-ons, enter design notes and, when the message topper is chosen, the topper text. The running price SHALL update as choices change.

#### Scenario: Tier limit
- **WHEN** the maximum tiers setting is 3
- **THEN** the "Add tier" control is not offered after the third tier

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
After success the app SHALL show the booking reference, server-priced lines, total and deposit, and the payment instructions (Airtel and MTN numbers, "quote your reference"), with a primary button to continue to `/` until the order page is delivered by `order-tracking`. The access token SHALL remain in the response for that change. If the server total differs from the reviewed total, the confirmation SHALL explain that the price was updated.

#### Scenario: Reference displayed
- **WHEN** a booking succeeds
- **THEN** the reference appears once in the display font and the screen has one filled button

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
