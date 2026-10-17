## ADDED Requirements

### Requirement: Remove stale pending uploads
The job SHALL delete pending images (no order) older than 24 hours from storage and the table.

#### Scenario: Abandoned upload
- **WHEN** a pending image is 25 hours old
- **THEN** its stored object and row are deleted

#### Scenario: Recent upload
- **WHEN** a pending image is 2 hours old
- **THEN** it is kept

### Requirement: Delete order images after 90 days
The job SHALL delete an order's images from storage and the table once the Lusaka date is more than 90 days after the event date.

#### Scenario: Day 90
- **WHEN** the event was 90 days ago
- **THEN** the images are kept

#### Scenario: Day 91
- **WHEN** the event was 91 days ago
- **THEN** the images are deleted

#### Scenario: Storage delete fails
- **WHEN** the storage call fails for one image
- **THEN** its row is kept and the next run retries it

### Requirement: Anonymise orders after two years
The job SHALL anonymise an order once the Lusaka date is more than two calendar years after its event date. Anonymising SHALL clear name, phone, email, delivery address, design notes, topper text, quote request description and all POP submissions, delete any remaining images, and set `anonymised_at`. It SHALL keep the reference, event date, lines, totals, statuses and timeline.

#### Scenario: Old order
- **WHEN** an order's event was 2 years and 1 day ago
- **THEN** its personal data is cleared, its totals are unchanged and `anonymised_at` is set

#### Scenario: Recent order
- **WHEN** an order's event was 1 year ago
- **THEN** it is unchanged

#### Scenario: Already anonymised
- **WHEN** the job runs again
- **THEN** nothing changes

### Requirement: Anonymised orders are not served
The customer order page and find-my-booking SHALL treat an anonymised order as not found. The owner list SHALL show it as anonymised without personal data.

#### Scenario: Old link
- **WHEN** a customer opens the link to an anonymised order
- **THEN** the generic not-found page is shown

### Requirement: Notification log retention
The job SHALL delete notification-log rows older than two years.

#### Scenario: Old log row
- **WHEN** a log row is 25 months old
- **THEN** it is deleted

### Requirement: Batches and idempotence
Each step SHALL process at most 200 rows per run, and running the job twice SHALL be safe. A failure in one step SHALL NOT stop the others, SHALL make the endpoint return 500, and SHALL NOT record a heartbeat.

#### Scenario: Backlog
- **WHEN** 500 images are due
- **THEN** the first run deletes 200 and later runs delete the rest

#### Scenario: One step fails
- **WHEN** the image step throws
- **THEN** the other steps still run, the response is 500 and no heartbeat is recorded

### Requirement: Owner erasure
The owner SHALL be able to erase an order's personal data immediately from the order sheet when the order is `completed` or `expired`, after a confirmation. The same anonymisation SHALL be applied.

#### Scenario: Active order
- **WHEN** the owner tries to erase a `confirmed` order
- **THEN** the action is refused with `ORDER_ACTIVE`

#### Scenario: Customer asks to be forgotten
- **WHEN** the owner erases a completed order
- **THEN** its personal data is cleared immediately

### Requirement: Privacy page
The app SHALL serve `/privacy` in plain language stating what is collected, why, who receives it (the owner, the SMS and email providers and the hosting providers), how long it is kept, and how to ask for deletion. The retention periods shown SHALL come from the same constants the job uses. The booking form's privacy note SHALL link to it.

#### Scenario: Periods match
- **WHEN** the retention constants change
- **THEN** the page text changes with them and a test fails if the page hard-codes a period

### Requirement: Missed-run health check
In production the check `jobs:retention` SHALL fail when the last heartbeat is older than 36 hours or absent.

#### Scenario: Stale
- **WHEN** the last heartbeat is 40 hours old in production
- **THEN** the check is `fail`
