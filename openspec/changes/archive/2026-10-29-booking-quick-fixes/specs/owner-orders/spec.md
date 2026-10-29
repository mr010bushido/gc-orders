## MODIFIED Requirements

### Requirement: New highlight
Orders the owner has not opened (`owner_seen_at` null) SHALL be marked New. Opening the order SHALL mark it seen. The New tag, and the Anonymised tag shown for anonymised orders, SHALL sit beside the order's reference line and SHALL NOT cover the total, the status pill or any other order text at any viewport width. The New tag SHALL use a non-alarm colour (not the danger or brick colour).

#### Scenario: Open a new order
- **WHEN** the owner opens an unseen order
- **THEN** it stops showing as New on the next load

#### Scenario: Total stays readable
- **WHEN** an unseen order is listed
- **THEN** the New tag is shown and the order's total is fully visible
