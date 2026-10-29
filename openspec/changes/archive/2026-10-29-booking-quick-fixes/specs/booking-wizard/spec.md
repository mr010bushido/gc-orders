## MODIFIED Requirements

### Requirement: Landing page
The home page SHALL show the logo, one display-font headline, one primary "Book a Cake" button leading to `/book`, and a secondary ghost-style "Find my booking" link leading to `/order`.

#### Scenario: Start booking
- **WHEN** a visitor presses "Book a Cake"
- **THEN** the wizard opens at step 1

#### Scenario: Find an existing booking
- **WHEN** a visitor presses "Find my booking"
- **THEN** the find-my-booking page at `/order` opens
