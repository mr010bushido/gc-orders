## MODIFIED Requirements

### Requirement: Confirmation screen
After success the app SHALL show the booking reference, server-priced lines, total and deposit, and the payment instructions (Airtel and MTN numbers, "quote your reference"), with a primary button to continue to `/order/<reference>?t=<accessToken>`. The access token SHALL remain in the response for the order-tracking hand-off. If the server total differs from the reviewed total, the confirmation SHALL explain that the price was updated.

#### Scenario: Continue to private order page
- **WHEN** a booking succeeds and the customer selects Continue
- **THEN** the app opens `/order/<reference>?t=<accessToken>`
