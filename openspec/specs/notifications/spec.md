# notifications Specification

## Purpose
TBD - created by archiving change notifications. Update Purpose after archive.
## Requirements
### Requirement: Sender interfaces and providers
The system SHALL send SMS through an `SmsSender` interface and email through an `EmailSender` interface. A factory SHALL return the Twilio and Resend implementations when their credentials are present and a console implementation otherwise. Application code SHALL NOT import a provider directly.

#### Scenario: No credentials
- **WHEN** the Twilio variables are missing
- **THEN** SMS messages are written to the console sender and no network call is made

#### Scenario: Provider swap
- **WHEN** a new SMS provider implements `SmsSender` and the factory returns it
- **THEN** no template or trigger code changes

### Requirement: Customer notifications
The system SHALL send these customer messages: booking received (SMS and email; reference, deposit amount, payment numbers, order link, and the pickup map pin for pickup orders), POP received (SMS and email), deposit verified (SMS and email; pickup map pin for pickup orders), quote ready (SMS and email; deposit link), and order expired (SMS only).

#### Scenario: Booking received for pickup
- **WHEN** a pickup order is created
- **THEN** the SMS and the email contain the reference, the deposit and the pickup map link

#### Scenario: Expiry is SMS only
- **WHEN** an order expires
- **THEN** one SMS is sent and no email

### Requirement: Owner notifications
The system SHALL send SMS and email to the owner on a new booking, a new quote request and a POP submission.

#### Scenario: POP submitted
- **WHEN** a customer submits POP text
- **THEN** the owner receives an SMS and an email naming the reference

#### Scenario: Owner phone not set
- **WHEN** the owner alert phone setting is empty
- **THEN** the SMS is skipped and logged as `skipped`, and the email is still sent

### Requirement: Failures never block
A provider error SHALL NOT fail the action that triggered the message, SHALL be recorded in the log with a failure status and a non-secret error summary, and SHALL NOT be retried automatically. A failed send SHALL remain visible to the owner as a `failed` log row; a resend issuing a fresh order link is left to `owner-orders`, because the plaintext order token is never stored.

#### Scenario: Twilio down during booking
- **WHEN** the SMS provider returns an error while a booking is created
- **THEN** the booking succeeds and a failed log row exists

### Requirement: Notification log
Every attempted message SHALL write a row with the order, event, channel, masked recipient, status (`sent`, `failed` or `skipped`), provider message id and time. The pair of order, event and channel SHALL be unique for once-only events.

#### Scenario: Duplicate trigger
- **WHEN** `deposit_verified` is triggered twice for one order
- **THEN** one SMS and one email are sent and the second call is a no-op

#### Scenario: Masked recipient
- **WHEN** an SMS goes to `+260977123456`
- **THEN** the log stores `+260 ••• ••• 456`

### Requirement: Message content rules
SMS text SHALL be plain text of at most 320 characters with no emoji, and amounts SHALL be formatted `K1,300`. Messages SHALL NOT contain the POP text or the customer's email.

#### Scenario: Length
- **WHEN** every SMS template is rendered with the longest realistic order
- **THEN** each result is at most 320 characters

### Requirement: Secrets stay out of output
Provider credentials SHALL come only from environment variables and SHALL NOT appear in logs, errors or the notification log.

#### Scenario: Error from provider
- **WHEN** the provider error text includes the account SID
- **THEN** the stored error summary does not

### Requirement: Notifications health check
The system SHALL register a `notifications` health check that reports `degraded` when `NODE_ENV` is `production` and either the SMS or the email channel uses the console sender or the order-link origin (`APP_URL`) is unset, and `ok` otherwise. It SHALL NOT reveal which variable is missing.

#### Scenario: Production without credentials
- **WHEN** production runs with no Twilio credentials
- **THEN** `GET /api/health` maps `notifications` to `degraded` and names no variable

#### Scenario: Link origin unset
- **WHEN** `APP_URL` is unset and a booking is received
- **THEN** the message carries no link and directs the customer to the order page in words, and in production the `notifications` check reports `degraded`

