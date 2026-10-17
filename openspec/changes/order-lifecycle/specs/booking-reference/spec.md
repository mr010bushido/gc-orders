## ADDED Requirements

### Requirement: Reference format and uniqueness
Every order SHALL receive a reference `CAKE-YYYY-NNNN`, where YYYY is the Africa/Lusaka year at creation and NNNN is a sequence number padded to at least 4 digits. One sequence SHALL serve all order types and reset each year. References SHALL be unique.

#### Scenario: First order of the year
- **WHEN** the first order is created in 2027
- **THEN** its reference is `CAKE-2027-0001`

#### Scenario: Year boundary in Lusaka
- **WHEN** an order is created at 23:30 UTC on 31 Dec 2026
- **THEN** its reference uses 2027

#### Scenario: Concurrent orders
- **WHEN** 20 orders are created at the same time
- **THEN** all 20 references are distinct and consecutive

#### Scenario: Rolled-back order
- **WHEN** an order transaction fails after a number was taken
- **THEN** that number is reused by the next order

#### Scenario: Beyond four digits
- **WHEN** the counter passes 9999
- **THEN** the reference is `CAKE-2026-10000`
