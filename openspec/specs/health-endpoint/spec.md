# health-endpoint Specification

## Purpose
TBD - created by archiving change platform-portability. Update Purpose after archive.
## Requirements
### Requirement: Health endpoint reports registered checks
The app SHALL expose `GET /api/health`. It SHALL run every registered health check and return 200 with `{ status: "ok", checks }` when all pass, or 503 with `{ status: "fail", checks }` when any fails. `checks` maps each check name to `"ok"` or `"fail"`. With no checks registered, it SHALL return 200.

#### Scenario: All checks pass
- **WHEN** two registered checks both succeed
- **THEN** the response is 200, `status` is `ok`, and both names map to `ok`

#### Scenario: One check fails
- **WHEN** one registered check rejects
- **THEN** the response is 503, `status` is `fail`, and that name maps to `fail`

#### Scenario: No checks registered
- **WHEN** no health checks have been registered
- **THEN** the response is 200 with `status: "ok"` and an empty `checks` object

### Requirement: Health responses disclose nothing
The health response SHALL NOT contain error text, stack traces, versions, hostnames or environment values, and SHALL be sent with `Cache-Control: no-store`.

#### Scenario: Failing check with a detailed error
- **WHEN** a check rejects with a message containing a connection string
- **THEN** the response body does not contain that message and only shows `fail` for that check

#### Scenario: Caching
- **WHEN** the endpoint responds
- **THEN** the `Cache-Control` header is `no-store`

### Requirement: Checks are registered by name
`registerHealthCheck(name, fn)` SHALL add a named check. Registering a name that already exists SHALL replace the earlier check, so hot reloads and tests do not accumulate duplicates.

#### Scenario: Duplicate name
- **WHEN** a check is registered twice under the same name
- **THEN** only the later one runs

