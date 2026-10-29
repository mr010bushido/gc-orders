## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Wedding details
When the visitor chooses "Wedding cake", the second step SHALL be Wedding details: a description of 10 to 2,000 characters, with helper text prompting for guest count, number of tiers, theme or colours, and flowers, and up to 3 reference photos. No price SHALL be shown for the wedding cake. Submission SHALL send a `wedding_cake` quote request with no priced cake. The review and confirmation SHALL state that the owner will send a quote and no deposit is due yet.

#### Scenario: Wedding order submitted
- **WHEN** the visitor completes Wedding details with a 40-character description and submits
- **THEN** an order is created in `awaiting_quote` with total K0, and the confirmation shows no payment numbers

#### Scenario: Description too short
- **WHEN** the description is 5 characters
- **THEN** an inline error asks for at least 10 characters and Next is disabled
