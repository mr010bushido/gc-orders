## ADDED Requirements

### Requirement: Only the configured owner can log in
The system SHALL allow a session only for the email in `OWNER_EMAIL`, compared case-insensitively. A session for any other email SHALL be treated as signed out.

#### Scenario: Other user with a valid Supabase session
- **WHEN** a request carries a valid session for a different email
- **THEN** `requireOwner()` treats it as signed out and redirects to the login page

#### Scenario: Owner session
- **WHEN** the request carries a valid session for `OWNER_EMAIL`
- **THEN** `requireOwner()` returns the owner

### Requirement: Login does not reveal valid emails
`/owner/login` SHALL show the same message and status for every submitted email, and SHALL send a link only when the email equals `OWNER_EMAIL`.

#### Scenario: Stranger's email
- **WHEN** someone submits `stranger@example.com`
- **THEN** the page shows the generic message and no email is sent

#### Scenario: Owner's email
- **WHEN** the owner submits their email
- **THEN** the page shows the same generic message and a link is sent

### Requirement: Link completion
`/owner/auth/callback` SHALL complete the login with the link parameters, create a session on success and redirect to `/owner/orders`. An invalid, expired or reused link SHALL create no session and redirect to the login page with an error notice.

#### Scenario: Reused link
- **WHEN** the same link is opened a second time
- **THEN** no session is created and the login page asks for a new link

#### Scenario: Link for a non-owner address
- **WHEN** a link completes for an email other than `OWNER_EMAIL`
- **THEN** the session is ended immediately and the login page is shown

### Requirement: Every owner action is guarded
Every server action, route handler and page under `/owner`, except the login and callback routes, SHALL call `requireOwner()` before reading or changing data. The proxy redirect SHALL NOT be the only protection.

#### Scenario: Unauthenticated action call
- **WHEN** an owner server action is invoked with no session
- **THEN** it performs no read or write and returns an unauthorised result

#### Scenario: Coverage test
- **WHEN** a new exported server action is added under `app/owner` without calling the guard
- **THEN** the guard-coverage test fails and names it

### Requirement: Login rate limiting
The system SHALL allow at most 5 link requests per client address per hour and 5 per email per hour, returning the generic message but sending nothing beyond the limit.

#### Scenario: Sixth request
- **WHEN** the sixth request arrives within an hour from one address
- **THEN** no email is sent and the response is still the generic message

### Requirement: Owner shell
Owner pages SHALL share a layout using only the sans font, with navigation, a theme toggle and a sign-out control. Signing out SHALL end the session. Owner responses SHALL carry `X-Robots-Tag: noindex` and `Cache-Control: no-store`.

#### Scenario: Sign out
- **WHEN** the owner chooses sign out
- **THEN** the session ends and `/owner/orders` redirects to the login page

#### Scenario: No display font
- **WHEN** any owner page renders
- **THEN** it uses no display-font class

### Requirement: Adapter passes the contract
The Supabase adapter SHALL pass `ownerAuthContract`, and only files under `lib/platform/adapters/supabase/` SHALL import `@supabase/*`.

#### Scenario: Contract suite
- **WHEN** the adapter is run against the shared suite with a mocked Supabase client
- **THEN** every scenario passes
