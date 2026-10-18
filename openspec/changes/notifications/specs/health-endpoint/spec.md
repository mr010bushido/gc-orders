## MODIFIED Requirements

### Requirement: Health endpoint reports registered checks
The app SHALL expose `GET /api/health`. It SHALL run every registered health check. A check that completes is `ok`, a check that completes reporting `degraded` is `degraded`, and a check that rejects or throws is `fail`. The response SHALL be 503 with `{ status: "fail", checks }` when any check fails; otherwise 200 with `{ status: "degraded", checks }` when any check is degraded; otherwise 200 with `{ status: "ok", checks }`. `checks` maps each check name to `"ok"`, `"degraded"` or `"fail"`. With no checks registered, it SHALL return 200 with `status: "ok"`.

#### Scenario: All checks pass
- **WHEN** two registered checks both succeed
- **THEN** the response is 200, `status` is `ok`, and both names map to `ok`

#### Scenario: One check fails
- **WHEN** one registered check rejects
- **THEN** the response is 503, `status` is `fail`, and that name maps to `fail`

#### Scenario: One check degraded
- **WHEN** one registered check reports `degraded` and no check fails
- **THEN** the response is 200, `status` is `degraded`, and that name maps to `degraded`

#### Scenario: No checks registered
- **WHEN** no health checks have been registered
- **THEN** the response is 200 with `status: "ok"` and an empty `checks` object
