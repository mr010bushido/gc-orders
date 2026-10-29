## MODIFIED Requirements

### Requirement: Submitting a quote request
A booking request MAY include a quote request with a kind (`character_cake`, `wedding_cake`, `toppings` or `other`) and a description of 10 to 2,000 characters. A `wedding_cake` quote request SHALL NOT be combined with a priced cake, and SHALL be rejected with `_form: WEDDING_WITH_CAKE` if it is. A quote request of any other kind SHALL require a priced cake, which serves as the base price, and SHALL be rejected with `quoteDescription: QUOTE_NEEDS_CAKE` without one. Desserts MAY accompany either. A request with a quote request SHALL count as a non-empty basket. Up to 3 image attach tokens MAY accompany it.

#### Scenario: Wedding quote only
- **WHEN** a request has no cake, no desserts and a wedding-cake quote request
- **THEN** an order is created in `awaiting_quote` with a reference and total K0

#### Scenario: Customised price-list cake
- **WHEN** a request has a classic 8" cake booked ahead and a toppings quote request
- **THEN** the order is `awaiting_quote`, the cake line is stored at K1,040 and the total is K1,040

#### Scenario: Wedding with a priced cake
- **WHEN** a request has a classic 8" cake and a wedding-cake quote request
- **THEN** the response contains `_form: WEDDING_WITH_CAKE` and no order is created

#### Scenario: Custom request without a cake
- **WHEN** a request has only desserts and an `other` quote request
- **THEN** the response contains `quoteDescription: QUOTE_NEEDS_CAKE` and no order is created

#### Scenario: Plain price-list order
- **WHEN** a request has a cake and no quote request
- **THEN** the order is created in `awaiting_payment`, never `awaiting_quote`

#### Scenario: Description too short
- **WHEN** the description is 4 characters
- **THEN** the response contains `quoteDescription: REQUIRED` and no order is created
