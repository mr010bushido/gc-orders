## ADDED Requirements

### Requirement: Booking request shape
`createBooking` SHALL accept a request with: an optional cake (flavour id, frosting id, tier sizes, add-on keys, design notes, topper message), zero or more dessert lines (dessert type id, quantity, note), fulfilment (`pickup` or `delivery`) with an address for delivery, event date, time window (`morning`, `afternoon` or `evening`), customer name, phone and email. Dessert lines SHALL have unique types and be capped at 50 lines as a request-size sanity limit. Duplicate types SHALL return `DUPLICATE_DESSERT`; more than 50 lines SHALL return `TOO_MANY_DESSERT_LINES`. It SHALL reject a request with no cake and no dessert line.

#### Scenario: Empty basket
- **WHEN** a request has neither a cake nor a dessert line
- **THEN** the response is `{ ok: false }` with error code `EMPTY_BASKET`

#### Scenario: Dessert line limit
- **WHEN** a request contains 51 dessert lines
- **THEN** the response contains `desserts: TOO_MANY_DESSERT_LINES`

#### Scenario: Duplicate dessert type
- **WHEN** a request includes the same dessert type more than once
- **THEN** the response contains `desserts: DUPLICATE_DESSERT`

### Requirement: Server-side validation with field errors
The action SHALL validate every field on the server and return all errors at once as a map from field to code. Required fields: name, phone, email, event date, time window, fulfilment, and a flavour and frosting when a cake is present. The phone SHALL be a valid Zambian mobile number and is stored normalised. The email SHALL be well formed.

#### Scenario: Several errors
- **WHEN** the name is empty and the phone is `12345`
- **THEN** the response contains `name: REQUIRED` and `phone: PHONE_INVALID`

#### Scenario: Normalised phone stored
- **WHEN** the phone is `0977 123 456`
- **THEN** the order stores `+260977123456`

#### Scenario: Delivery needs an address
- **WHEN** fulfilment is `delivery` and the address is blank
- **THEN** the response contains `address: DELIVERY_ADDRESS_REQUIRED`

### Requirement: Prices are computed on the server
The action SHALL ignore any price sent by the client, load the catalogue, price the basket with `priceBasket`, and store that result as the order snapshot.

#### Scenario: Tampered price
- **WHEN** the request body includes a total of K1
- **THEN** the stored total is the server-computed total

#### Scenario: Inactive flavour
- **WHEN** the request names a flavour that has been hidden
- **THEN** the response contains `flavour: INACTIVE_ITEM` and no order is created

### Requirement: Date rules at submission
The action SHALL refuse an event date before `earliestEventDate` for the basket (`DATE_TOO_SOON`) and a closed date (`DATE_UNAVAILABLE`), using the time of submission as `now`.

#### Scenario: Dessert-only too soon
- **WHEN** a dessert-only request is submitted for a date 3 days away
- **THEN** the response contains `eventDate: DATE_TOO_SOON`

#### Scenario: Cake rush locked
- **WHEN** a cake for tomorrow is submitted at 15:00
- **THEN** the stored order includes the rush line computed at submission and it does not change later

### Requirement: Successful response
On success the action SHALL create the order through `createOrder` and return the reference, the total, the deposit and the payment instructions (Airtel number, MTN number, deposit amount, the reference to quote), read from settings. The order SHALL start as `awaiting_payment`.

#### Scenario: Created
- **WHEN** a valid request is submitted
- **THEN** the response contains a `CAKE-YYYY-NNNN` reference, the deposit equal to half the total rounded half-up, and both mobile money numbers

### Requirement: Notifications after commit
After the order is committed the action SHALL send the customer's booking-received message and the owner's new-booking message through `notify`. A failure to send SHALL NOT change the response.

#### Scenario: SMS provider down
- **WHEN** the SMS provider fails after the order is created
- **THEN** the response is still `ok: true` and the failure is in the notification log

### Requirement: Abuse protection
The action SHALL reject a request whose honeypot field is filled. It SHALL NOT impose a per-IP booking submission limit. The separate capacity threshold counts confirmed orders for each event date and remains governed by `date-availability`.

#### Scenario: Honeypot filled
- **WHEN** the hidden field has a value
- **THEN** no order is created and the response looks like a validation failure

#### Scenario: Shared internet connection
- **WHEN** one address submits more than 10 otherwise valid requests within an hour for open event dates
- **THEN** the action does not reject them because they share an IP address

### Requirement: No personal data in logs
The action SHALL NOT write names, phone numbers, emails or addresses to logs.

#### Scenario: Failed booking logged
- **WHEN** a request fails validation
- **THEN** any log line contains error codes and no customer fields
