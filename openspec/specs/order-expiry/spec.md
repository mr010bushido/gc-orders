# order-expiry Specification

## Purpose
Unpaid bookings expire automatically: a scheduled `expire-orders` job moves `awaiting_payment` orders past their payment deadline to `expired`, texts the customer once, and records a heartbeat whose staleness fails the production health check.
## Requirements
### Requirement: Expire unpaid orders
The job `expire-orders` SHALL move every `awaiting_payment` order whose deadline has passed to `expired` with actor `system`, handling at most 100 orders per run.

#### Scenario: Overdue order
- **WHEN** an order's deadline passed 10 minutes ago and the job runs
- **THEN** the order is `expired` and the timeline gains a system event

#### Scenario: Not yet due
- **WHEN** an order's deadline is 5 minutes away
- **THEN** the job leaves it alone

#### Scenario: Other statuses untouched
- **WHEN** a flagged `awaiting_verification` order is 3 days old
- **THEN** the job does not change it

#### Scenario: Batch limit
- **WHEN** 150 orders are overdue
- **THEN** the first run expires 100 and the next run expires the rest

### Requirement: Idempotent and race-safe
Running the job twice, or two runs overlapping, SHALL expire each order once, write one event and send one notice. An order that receives POP between selection and update SHALL NOT be expired.

#### Scenario: Run twice
- **WHEN** the job runs twice in a row
- **THEN** the second run expires nothing and sends nothing

#### Scenario: POP lands mid-run
- **WHEN** a customer submits POP after the job selected their order but before it updated
- **THEN** the order stays `awaiting_verification`

### Requirement: Customer notice
For each order the run expires, the system SHALL send the customer one SMS through `notify('order_expired')` and no email. A send failure SHALL NOT stop the run or undo the expiry.

#### Scenario: SMS fails
- **WHEN** the SMS provider errors for one order
- **THEN** that order is still expired, the failure is logged, and the other orders are processed

### Requirement: Registered behind the jobs endpoint
The job SHALL be reachable as `POST /api/jobs/expire-orders` through the bearer-secret endpoint and SHALL record a heartbeat after each successful run.

#### Scenario: Authorised call
- **WHEN** the endpoint receives the correct secret for `expire-orders`
- **THEN** the handler runs and a heartbeat is recorded

### Requirement: Missed-run health check
In production the health endpoint SHALL report the check `jobs:expire-orders` as failed when the last heartbeat is older than 45 minutes or absent. Outside production it SHALL report ok.

#### Scenario: Stale heartbeat
- **WHEN** the last heartbeat is 50 minutes old in production
- **THEN** the check is `fail`

#### Scenario: Preview deployment
- **WHEN** the environment is not production
- **THEN** the check is `ok` with no heartbeat

### Requirement: Scheduler setup is documented, not coded
The repository SHALL contain the `pg_cron` SQL for a 15-minute schedule and a systemd timer and service example under `ops/`, with the secret as a placeholder, and SHALL NOT contain a real secret.

#### Scenario: Placeholder only
- **WHEN** a secrets scan runs over `ops/`
- **THEN** it finds no real secret value

