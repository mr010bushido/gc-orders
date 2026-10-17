## ADDED Requirements

### Requirement: Catalogue is stored in the database
The system SHALL store flavour groups with base prices, flavours with their group and diet, frostings, size multipliers in hundredths, add-ons with prices, dessert types with prices and flavour suggestions, and settings. Each item except settings SHALL have an `active` flag and a sort order. Flavour group, size multiplier and dessert type prices SHALL be positive; an add-on price MAY be K0. Toppings and fruit toppings, which the PRD prices as "Varies", SHALL NOT be catalogue items: the customer requests them in a note and the owner prices them as a quote line.

#### Scenario: Free add-on
- **WHEN** a cake is quoted with the K0 Chocolate drip add-on
- **THEN** the quote has a K0 "Chocolate drip" line and the same total and deposit as without it

#### Scenario: Hidden flavour
- **WHEN** a flavour is set to inactive
- **THEN** it is absent from the orderable catalogue and remains in the full catalogue

### Requirement: Seed reproduces the PRD price list
`pnpm db:seed` SHALL insert the PRD Appendix A and B data and every setting default, and SHALL NOT overwrite or duplicate existing rows.

#### Scenario: Fresh seed
- **WHEN** the seed runs on a migrated empty database
- **THEN** there are 13 standard flavours, 6 special-diet flavours, 3 frostings, 5 sizes, 4 add-ons (Chocolate drip at K0, Edible print K100, Gloss print K75, Message topper K100) and 11 dessert types, priced as in the PRD

#### Scenario: Seed after owner edits
- **WHEN** the owner has changed the classic price to K1,350 and the seed runs again
- **THEN** the classic price is still K1,350

### Requirement: Settings registry with bounds
The system SHALL define every setting in code with a type, default, minimum and maximum, and SHALL reject a write outside its bounds. The registry SHALL include: maximum tiers (default 3, 1 to 5), delivery fee (150), rush rate percent (20), rush window hours (48), dessert minimum quantity (30), dessert lead days (5), dessert short-notice surcharge percent (20), capacity per day (10), payment expiry hours (24), the morning, afternoon and evening window hours, the Airtel and MTN numbers, the pickup map URL and the owner alert phone.

#### Scenario: Out-of-range write
- **WHEN** maximum tiers is set to 0 or 9
- **THEN** the write is rejected and the stored value is unchanged

#### Scenario: Missing text setting
- **WHEN** the owner alert phone has never been set
- **THEN** `getCatalogue` returns it as null and does not throw

### Requirement: Pricing is driven by the catalogue
`toPricingRules(catalogue)` SHALL produce the tables and rates consumed by `quote()` and `priceBasket()`, using only active items. The maximum tier count SHALL come from the setting, replacing the fixed limit of 3.

#### Scenario: Default catalogue matches the original engine
- **WHEN** the seeded catalogue prices each `cake-pricing` scenario
- **THEN** every result equals the original engine's result

#### Scenario: Changed base price
- **WHEN** the classic base price is changed to K1,500 and a classic 10" cake is quoted
- **THEN** the cake price is K1,500

#### Scenario: Raised tier limit
- **WHEN** maximum tiers is 4 and a cake has 4 tiers
- **THEN** the quote succeeds; with 5 tiers it is rejected

### Requirement: Selections are validated against the catalogue
`resolveFlavour` and related lookups SHALL reject an unknown or inactive flavour, frosting, size, add-on or dessert type with a distinct error code.

#### Scenario: Inactive frosting
- **WHEN** a booking names a frosting that is inactive
- **THEN** validation fails with `INACTIVE_ITEM`

### Requirement: Edits apply to the next booking
The system SHALL NOT cache the catalogue across requests.

#### Scenario: Price edit visible immediately
- **WHEN** the owner changes a price and a customer loads the booking form afterwards
- **THEN** the form uses the new price
