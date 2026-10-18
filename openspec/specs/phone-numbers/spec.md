# phone-numbers Specification

## Purpose
TBD - created by archiving change order-lifecycle. Update Purpose after archive.
## Requirements
### Requirement: Normalise Zambian mobile numbers
The system SHALL accept a Zambian mobile number written as `+260…`, `260…`, `00260…`, `0…` or the nine national digits, with spaces, dashes and brackets ignored, and SHALL return it as `+260` followed by nine digits starting with 5, 7 or 9. It SHALL reject anything else.

#### Scenario: Local format
- **WHEN** the input is `0977 123 456`
- **THEN** the result is `+260977123456`

#### Scenario: International with spaces
- **WHEN** the input is `+260 96 622 2440`
- **THEN** the result is `+260966222440`

#### Scenario: Foreign number
- **WHEN** the input is `+254712345678`
- **THEN** it is rejected

#### Scenario: Landline
- **WHEN** the input is `0211 123 456`
- **THEN** it is rejected

#### Scenario: Wrong length
- **WHEN** the input has eight digits after the country code
- **THEN** it is rejected

### Requirement: One implementation on client and server
The same normalisation function SHALL be used by the booking form and the server, and the server SHALL normalise again before storing.

#### Scenario: Client bypassed
- **WHEN** a request arrives with an unnormalised number
- **THEN** the server normalises it, or rejects it if invalid

