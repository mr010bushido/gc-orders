# scheduled-jobs Specification

## Purpose
TBD - created by archiving change platform-portability. Update Purpose after archive.
## Requirements
### Requirement: Jobs are invoked over an authenticated HTTP endpoint
The app SHALL expose `POST /api/jobs/<name>` for scheduled work. The request SHALL carry `Authorization: Bearer <secret>`, where the secret is the environment variable `JOBS_SECRET`. The caller is not the app's concern: `pg_cron`, a systemd timer or any other scheduler MAY invoke it.

#### Scenario: Valid secret, known job
- **WHEN** a POST arrives with the correct bearer secret for a registered job
- **THEN** the job handler runs and the response is 200 with `{ job, ok: true, startedAt, finishedAt }`

#### Scenario: Missing or wrong secret
- **WHEN** a POST arrives with no bearer header or a wrong secret
- **THEN** the response is 401, no handler runs, and the response does not reveal whether the job exists

#### Scenario: Unknown job
- **WHEN** a POST arrives with the correct secret for a name that is not registered
- **THEN** the response is 404

### Requirement: Fail closed when unconfigured
If `JOBS_SECRET` is unset or empty, the endpoint SHALL return 503 for every request and SHALL NOT run any handler, including requests that send an empty bearer value.

#### Scenario: No secret configured
- **WHEN** `JOBS_SECRET` is unset and a POST arrives with `Authorization: Bearer `
- **THEN** the response is 503 and no handler runs

### Requirement: Constant-time secret comparison
The endpoint SHALL compare the supplied secret to `JOBS_SECRET` in constant time, so response timing does not reveal how many leading characters matched.

#### Scenario: Different lengths
- **WHEN** the supplied secret has a different length from `JOBS_SECRET`
- **THEN** the comparison completes without throwing and the request is rejected with 401

### Requirement: Handlers are idempotent and failures are visible
Job handlers SHALL be written so that running one twice in a row is safe, because schedulers can retry or overlap. If a handler throws, the endpoint SHALL return 500 with `{ job, ok: false }`, SHALL NOT record a heartbeat, and SHALL NOT include the error text in the response.

#### Scenario: Handler throws
- **WHEN** a registered handler throws an error containing a secret value
- **THEN** the response is 500 with `ok: false`, the body does not contain the error text, and no heartbeat is recorded for that run

### Requirement: Heartbeat after each successful run
After a handler completes successfully the endpoint SHALL record a heartbeat for that job through `HeartbeatStore.record(job, at)`. `HeartbeatStore.last(job)` SHALL return the time of the most recent heartbeat, or null if none exists.

#### Scenario: Successful run
- **WHEN** a job runs successfully
- **THEN** `last(job)` returns a time at or after the run's start

#### Scenario: Never run
- **WHEN** a job has never run
- **THEN** `last(job)` returns null

