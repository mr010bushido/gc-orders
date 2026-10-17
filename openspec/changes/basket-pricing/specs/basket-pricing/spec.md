## ADDED Requirements

### Requirement: Basket must contain an item
The system SHALL price a basket made of an optional cake, zero or more dessert lines and zero or more quote lines, and SHALL reject a basket with none of them.

#### Scenario: Empty basket
- **WHEN** a basket has no cake, no dessert lines and no quote lines
- **THEN** pricing is rejected with code `EMPTY_BASKET`

#### Scenario: Cake only
- **WHEN** a basket has only a classic 8" cake, pickup, booked more than 5 days ahead
- **THEN** the total is K1,040 and the deposit is K520

### Requirement: Dessert pricing and minimum
The system SHALL price each dessert line at K30 per piece and SHALL require at least 30 pieces per dessert type. A line's flavour split SHALL be a free-text note and SHALL NOT change the price.

#### Scenario: Below the minimum
- **WHEN** a dessert line has 29 pieces
- **THEN** pricing is rejected with code `DESSERT_MIN_QUANTITY`

#### Scenario: Mixed flavours
- **WHEN** a line of 30 assorted cupcakes has the note "10 vanilla, 10 chocolate, 10 lemon"
- **THEN** the line costs K900

#### Scenario: Unknown dessert
- **WHEN** a line names a dessert type that does not exist
- **THEN** pricing is rejected with code `UNKNOWN_DESSERT`

### Requirement: Dessert-only lead time
The system SHALL refuse a basket with desserts and no cake when fewer than 5 days separate the moment of pricing from 00:00 Africa/Lusaka on the event date.

#### Scenario: Four and a half days
- **WHEN** it is 12:00 on 10 Sep in Lusaka and a dessert-only basket is priced for 15 Sep
- **THEN** pricing is rejected with code `DESSERT_LEAD_TIME`

#### Scenario: Just enough notice
- **WHEN** it is 12:00 on 10 Sep in Lusaka and 30 cupcakes are priced for 16 Sep, pickup
- **THEN** the total is K900 and the deposit is K450

### Requirement: Short-notice dessert surcharge with a cake
When a basket has a cake and its desserts are less than 5 days from the event, the system SHALL add 20% of the dessert subtotal. The cake's own 48-hour rush SHALL be calculated separately, and neither fee SHALL apply to the other item.

#### Scenario: Three days, cake plus desserts
- **WHEN** it is 12:00 on 10 Sep in Lusaka and a classic 8" cake with 30 cupcakes is priced for 13 Sep, pickup
- **THEN** the dessert surcharge is K180, the cake rush is K0, the total is K2,120 and the deposit is K1,060

#### Scenario: Both fees
- **WHEN** it is 12:00 on 10 Sep in Lusaka and the same basket is priced for 12 Sep
- **THEN** the cake rush is K208, the dessert surcharge is K180, the total is K2,328 and the deposit is K1,164

#### Scenario: Plenty of notice
- **WHEN** the event is 5 or more days away
- **THEN** both fees are K0

### Requirement: One delivery fee
The system SHALL add a flat K150 delivery fee once per order when delivery is chosen, whatever the basket contains.

#### Scenario: Cake and desserts delivered
- **WHEN** a classic 8" cake and 30 cupcakes are priced for delivery with no fees due
- **THEN** exactly one delivery line of K150 is present and the total is K2,090

### Requirement: Owner quote lines
The system SHALL accept quote lines with a label and a positive whole-Kwacha amount, add them to the total, and include them in the 50% deposit. Rush and surcharge rules SHALL NOT apply to them.

#### Scenario: Cake plus quote line
- **WHEN** a classic 8" cake booked well ahead has a quote line of K500
- **THEN** the total is K1,540 and the deposit is K770

#### Scenario: Invalid amount
- **WHEN** a quote line has an amount of 0 or 12.5
- **THEN** pricing is rejected with code `INVALID_QUOTE_LINE`

### Requirement: Itemised lines for snapshots
The system SHALL return the priced basket as an ordered list of lines, each with a kind (`cake`, `rush`, `addon`, `dessert`, `dessert_surcharge`, `delivery`, `quote`), a label, a quantity, a unit amount and a line amount, plus the total and deposit. The line amounts SHALL sum to the total.

#### Scenario: Lines add up
- **WHEN** any valid basket is priced
- **THEN** the sum of the line amounts equals the total

### Requirement: Event date helpers
The system SHALL provide `earliestEventDate(hasCake, now)` returning the first bookable Lusaka date as `YYYY-MM-DD`: tomorrow for a basket with a cake, and the first date at least 5 days away for desserts only. It SHALL provide `isCakeRushDate(date, now)` that is true when 00:00 Lusaka on that date is less than 48 hours away.

#### Scenario: Cake earliest date near midnight UTC
- **WHEN** it is 23:30 UTC on 14 Sep (01:30 on 15 Sep in Lusaka) and the basket has a cake
- **THEN** the earliest date is 2026-09-16

#### Scenario: Dessert-only earliest date
- **WHEN** it is 12:00 on 10 Sep in Lusaka and the basket has only desserts
- **THEN** the earliest date is 2026-09-16

#### Scenario: Rush date
- **WHEN** it is 12:00 on 10 Sep in Lusaka
- **THEN** `isCakeRushDate` is true for 11 and 12 Sep and false for 13 Sep
