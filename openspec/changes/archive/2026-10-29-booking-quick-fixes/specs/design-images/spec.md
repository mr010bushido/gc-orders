## MODIFIED Requirements

### Requirement: Uploader component
`ImageUploader` SHALL let a visitor choose up to 3 photos, downscale them in the browser before upload, show thumbnails with remove buttons, upload progress and clear error messages, and have an `accept` list of JPEG, PNG and WebP. It SHALL work with the keyboard and label every control. It SHALL work in browser contexts that are not secure (plain HTTP), so it SHALL NOT depend on `crypto.randomUUID` or other secure-context-only APIs.

#### Scenario: Fourth photo
- **WHEN** three photos are attached
- **THEN** the add control is disabled with an explanation

#### Scenario: Non-secure context
- **WHEN** a visitor adds a photo on a page served over plain HTTP, where `crypto.randomUUID` is undefined
- **THEN** the photo is added and its upload starts without an error
