## ADDED Requirements

### Requirement: Upload limits
The system SHALL accept an image upload only if it is at most 5 MB, is a JPEG, PNG or WebP as determined by its contents, and decodes successfully. It SHALL ignore the declared content type and file name.

#### Scenario: Oversized file
- **WHEN** a 6 MB image is uploaded
- **THEN** the response is 413 with code `IMAGE_TOO_LARGE` and nothing is stored

#### Scenario: Wrong type
- **WHEN** a PDF renamed `design.jpg` is uploaded
- **THEN** the response is 415 with code `IMAGE_TYPE_UNSUPPORTED`

#### Scenario: HEIC
- **WHEN** a raw HEIC file is uploaded
- **THEN** the response is 415 and the message tells the customer to choose a JPEG or PNG photo

### Requirement: Processing strips metadata and reduces size
Accepted images SHALL be rotated by their orientation, resized so the longest edge is at most 1600px (never enlarged), and re-encoded as WebP. The stored file SHALL contain no EXIF or location data.

#### Scenario: Photo with location
- **WHEN** a JPEG with GPS EXIF data is uploaded
- **THEN** the stored image has no EXIF block

#### Scenario: Large photo
- **WHEN** a 4000x3000 image is uploaded
- **THEN** the stored image is 1600x1200

#### Scenario: Small photo
- **WHEN** a 800x600 image is uploaded
- **THEN** its dimensions are unchanged

### Requirement: Private storage
Images SHALL be stored through `ImageStore` in a private bucket under `images/<imageId>.webp`. The system SHALL NOT expose a public URL. Reading SHALL be by signed URL with a TTL of 300 seconds, created server-side for the owner only.

#### Scenario: Owner views
- **WHEN** the owner opens an order with images
- **THEN** each image URL is a signed URL that expires after 300 seconds

#### Scenario: Customer or visitor
- **WHEN** anyone other than the signed-in owner requests an order's images
- **THEN** no signed URL is issued

### Requirement: Upload before order, attach on submit
An upload SHALL create a pending image with no order and return an id and a random attach token whose hash is stored. A booking request MAY carry up to 3 attach tokens, and order creation SHALL attach those images to the order in the same transaction. A token SHALL attach once only.

#### Scenario: Attach three
- **WHEN** a booking request carries three valid tokens
- **THEN** the order has three images and the pending state is cleared

#### Scenario: Fourth image
- **WHEN** a request carries four tokens
- **THEN** it is rejected with `TOO_MANY_IMAGES`

#### Scenario: Wrong token
- **WHEN** a request carries a token that matches no pending image
- **THEN** it is rejected with `IMAGE_NOT_FOUND`

### Requirement: Removing a pending upload
`DELETE /api/uploads/[id]` with the correct token SHALL delete the pending image from storage and the table. A wrong token SHALL return 404.

#### Scenario: Customer removes a photo
- **WHEN** the customer removes a thumbnail before submitting
- **THEN** the stored object and row are deleted

### Requirement: Upload abuse limits
The system SHALL allow at most 20 uploads per client address per hour and at most 6 pending uploads per address at once.

#### Scenario: Seventh pending
- **WHEN** an address already has 6 pending uploads
- **THEN** the next upload is rejected with `RATE_LIMITED`

### Requirement: Uploader component
`ImageUploader` SHALL let a visitor choose up to 3 photos, downscale them in the browser before upload, show thumbnails with remove buttons, upload progress and clear error messages, and have an `accept` list of JPEG, PNG and WebP. It SHALL work with the keyboard and label every control.

#### Scenario: Fourth photo
- **WHEN** three photos are attached
- **THEN** the add control is disabled with an explanation

### Requirement: Supabase adapter passes the contract
The Supabase Storage adapter SHALL pass `imageStoreContract`, and no other file SHALL import `@supabase/*`.

#### Scenario: Contract suite
- **WHEN** the adapter runs the shared suite against a mocked client
- **THEN** every scenario passes
