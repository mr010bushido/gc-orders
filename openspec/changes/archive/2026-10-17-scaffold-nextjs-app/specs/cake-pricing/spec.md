## ADDED Requirements

### Requirement: Cake price from flavour group and tiers
The system SHALL price a cake as the flavour group's 10" base price multiplied by the sum of the size multipliers of its tiers. Base prices: classic K1,300, signature K1,400, traditional fruit K2,000, vegan/diabetic K1,700. Multipliers: 8" 0.80, 10" 1.00, 12" 1.20, 14" 1.44, 16" 1.73.

#### Scenario: Single tier
- **WHEN** a classic cake has one 8" tier
- **THEN** the cake price is K1,040

#### Scenario: Multiple tiers
- **WHEN** a signature cake has tiers of 8" and 10"
- **THEN** the cake price is K2,520 (1,400 × 1.80)

### Requirement: Tier count limit
The system SHALL reject a cake with fewer than 1 or more than the maximum number of tiers. The maximum is 3 until owner settings exist.

#### Scenario: No tiers
- **WHEN** a quote is requested with zero tiers
- **THEN** the system rejects it

#### Scenario: Too many tiers
- **WHEN** a quote is requested with 4 tiers
- **THEN** the system rejects it

### Requirement: Earliest event date is tomorrow
The system SHALL reject an event date that is today or earlier, using the Africa/Lusaka calendar date.

#### Scenario: Same-day booking
- **WHEN** the event date equals today's date in Lusaka
- **THEN** the system rejects the quote

#### Scenario: Late-evening UTC edge
- **WHEN** it is 23:30 UTC on 14 Sep (01:30 on 15 Sep in Lusaka) and the event date is 15 Sep
- **THEN** the system rejects the quote as same-day

### Requirement: Short-notice fee on cake only
The system SHALL add 20% of the cake price when less than 48 hours separate the moment of quoting (submission) from 00:00 Africa/Lusaka on the event date. The fee SHALL NOT apply to add-ons or delivery.

#### Scenario: Within 48 hours
- **WHEN** it is 12:00 on 14 Sep in Lusaka and a traditional fruit 10" cake is booked for 16 Sep with a message topper and delivery
- **THEN** the short-notice fee is K400 and the total is K2,650

#### Scenario: Outside 48 hours
- **WHEN** the event date's 00:00 is 48 hours or more away
- **THEN** the short-notice fee is K0

### Requirement: Add-ons and delivery
The system SHALL add K100 for an edible print, K75 for a gloss print and K100 for a message topper. Delivery SHALL add a flat K150; pickup is free.

#### Scenario: Gloss print with delivery
- **WHEN** a signature 8" + 10" cake has a gloss print and delivery, outside 48 hours
- **THEN** the total is K2,745

### Requirement: Whole-Kwacha amounts and 50% deposit
The system SHALL round the cake price, the short-notice fee, the total and the deposit to whole Kwacha, half-up. The deposit SHALL be 50% of the unrounded total, rounded the same way.

#### Scenario: Deposit rounding
- **WHEN** the total is K2,650
- **THEN** the deposit is K1,325
