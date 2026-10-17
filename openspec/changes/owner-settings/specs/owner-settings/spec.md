## ADDED Requirements

### Requirement: Edit prices and multipliers
The owner SHALL be able to change a flavour group's base price, an add-on's price, a dessert type's price and a size multiplier. Prices SHALL be whole Kwacha of at least 1. Multipliers SHALL be entered as decimals between 0.10 and 5.00 and stored in hundredths.

#### Scenario: Change a base price
- **WHEN** the owner sets the classic base price to K1,350 and saves
- **THEN** the next quote for a classic 10" cake is K1,350

#### Scenario: Invalid price
- **WHEN** the owner enters `12.5` or `0` as a price
- **THEN** the save is rejected with a field error and nothing changes

#### Scenario: Multiplier entry
- **WHEN** the owner enters `1.2` for 12"
- **THEN** the stored multiplier is 120

### Requirement: Manage items without deleting
The owner SHALL be able to add, rename, reprice and hide flavours, frostings, add-ons and dessert types (with their flavour suggestions). Items SHALL NOT be deleted. Names SHALL be unique within a list, case-insensitively.

#### Scenario: Hide a flavour
- **WHEN** the owner hides Banana Cinnamon
- **THEN** new bookings cannot choose it and existing orders still show it

#### Scenario: Duplicate name
- **WHEN** the owner adds a flavour named "vanilla" that already exists
- **THEN** the save is rejected with `DUPLICATE_NAME`

### Requirement: Cannot hide the last choice
The system SHALL refuse to hide the last active flavour, frosting, size or dessert type.

#### Scenario: Last frosting
- **WHEN** only one frosting is active and the owner hides it
- **THEN** the change is rejected with `LAST_ACTIVE_ITEM`

### Requirement: Edit fees and rules
The owner SHALL be able to edit the delivery fee, rush rate and window, dessert minimum, lead days and surcharge, maximum tiers, capacity per day and payment expiry hours, each within the registry bounds.

#### Scenario: Out of bounds
- **WHEN** the owner sets maximum tiers to 9
- **THEN** the save is rejected with a message stating the allowed range

### Requirement: Time windows
The owner SHALL be able to set the hours of the morning, afternoon and evening windows. Each window SHALL have a start before its end, and windows SHALL NOT overlap.

#### Scenario: Overlap
- **WHEN** afternoon starts before morning ends
- **THEN** the save is rejected with `WINDOWS_OVERLAP`

### Requirement: Payment and contact details
The owner SHALL be able to set the Airtel and MTN numbers, the pickup map link and the owner alert phone. Phone numbers SHALL be normalised to `+260…`. The map link SHALL be an `https` URL.

#### Scenario: Number normalised
- **WHEN** the owner enters `0977 659 782` for Airtel
- **THEN** `+260977659782` is stored and shown as `+260 977 659 782`

#### Scenario: Insecure link
- **WHEN** the map link is `http://example.com`
- **THEN** the save is rejected

### Requirement: Changes apply to new bookings only
Saving a setting or price SHALL NOT change any existing order. Each settings section SHALL say so.

#### Scenario: Existing order unchanged
- **WHEN** a price is changed after an order was booked
- **THEN** the order's lines and totals are unchanged

### Requirement: Owner-only
All reads and writes on `/owner/settings` SHALL call `requireOwner()`.

#### Scenario: No session
- **WHEN** a settings action runs without a session
- **THEN** it returns unauthorised and nothing is written
