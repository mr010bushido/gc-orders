# ui-components Specification

## Purpose
TBD - created by archiving change design-system-components. Update Purpose after archive.
## Requirements
### Requirement: Components use tokens only
Every component SHALL take its colour, radius, border and shadow from design tokens. A component SHALL NOT contain a hex or `rgb()` colour value, SHALL NOT use `dark:` colour overrides, and SHALL use a shadow only on floating surfaces (`Sheet`).

#### Scenario: Hard-coded colour
- **WHEN** the test suite scans `components/ui/*.tsx`
- **THEN** it fails if any file contains a hex colour literal or a `dark:` colour class

#### Scenario: Dark mode
- **WHEN** `data-theme="dark"` is set on `<html>`
- **THEN** the components change appearance through tokens alone, with no component code branching on the theme

### Requirement: Button
`Button` SHALL render a primary variant (52px tall, brick fill) and a ghost variant (1px `ink` border, transparent fill), full width on phones. It SHALL render an anchor when given `href` and a `<button>` otherwise. A disabled primary button SHALL use the disabled tokens and SHALL NOT fire `onClick`.

#### Scenario: Disabled primary
- **WHEN** a primary `Button` is disabled and clicked
- **THEN** `onClick` is not called and the button has the disabled styling

#### Scenario: Link button
- **WHEN** `Button` is given an `href`
- **THEN** it renders an `<a>` with the same classes

### Requirement: Input with visible label and error state
`Input` SHALL render a visible label above a 48px field with 16px text. With an `error` prop it SHALL set `aria-invalid`, link the helper text through `aria-describedby`, show the error icon and message in `err-ink`, and use the error border.

#### Scenario: Error shown
- **WHEN** `Input` is rendered with `error="Enter a Zambian mobile number"`
- **THEN** the field is `aria-invalid="true"` and the message is announced as its description

#### Scenario: Label stays visible
- **WHEN** the field has a value or placeholder
- **THEN** the label is still rendered above it

### Requirement: Radio cards
`RadioCardGroup` SHALL render real `<input type="radio">` elements inside `<label>` cards in a two-column grid, mark the selected card with a 1.5px brick border, and support keyboard selection with arrow keys.

#### Scenario: Select with keyboard
- **WHEN** the focus is on a selected card and the user presses the right arrow
- **THEN** the next card becomes selected and `onChange` fires with its value

### Requirement: Add-on list
`AddonList` SHALL render one bordered list of checkbox rows at least 52px tall with hairline dividers and the price right-aligned in tabular figures. It SHALL be controlled by a set of selected keys.

#### Scenario: Toggle an add-on
- **WHEN** a row is clicked
- **THEN** `onChange` receives the selected keys with that key added or removed

### Requirement: Date picker
`DatePicker` SHALL show a month grid with the month name in the display font. It SHALL mark rush days with the warning tokens, closed days with a strikethrough and the disabled colour, past days in the `past` colour, and the selected day as a brick-filled circle. Days before `minDate`, past days and closed days SHALL NOT be selectable. All dates SHALL be `YYYY-MM-DD` strings supplied by the caller. A `monthFont` prop (`display` by default, `sans` for owner screens) SHALL select the font of the month name.

#### Scenario: Closed day
- **WHEN** a day is in `closedDates` and the user clicks it
- **THEN** `onChange` is not called

#### Scenario: Rush day
- **WHEN** `isRush("2026-09-15")` returns true
- **THEN** that day carries the warning background and text tokens and is still selectable

#### Scenario: Before the minimum date
- **WHEN** `minDate` is `2026-09-20`
- **THEN** every earlier day is rendered as unavailable and cannot be selected

#### Scenario: Owner variant
- **WHEN** `monthFont="sans"` is passed
- **THEN** the month name uses the sans font class instead of the display class

#### Scenario: Keyboard navigation
- **WHEN** a day has focus and the user presses the arrow keys, Home, End, Page Up or Page Down
- **THEN** focus moves by day, week, row edge or month, and Enter or Space selects the focused day

### Requirement: Stepper
`Stepper` SHALL take a list of step labels and the current index. On phones it SHALL show the overline "Step N of M · Label" over M segments (brick for done and current, line for to-do). From tablet width it SHALL show numbered circles joined by lines. The current step SHALL have `aria-current="step"`.

#### Scenario: Step count changes
- **WHEN** the caller passes three labels instead of four
- **THEN** the overline reads "Step 2 of 3 · …" and three segments render

### Requirement: Summary card
`SummaryCard` SHALL render line items as `<dl>` rows with hairline dividers, a rush line in `warn-ink` when present, a total row on `gold-wash` with the amount in the display font at 34px, and a deposit line below. Amounts SHALL be shown as `K1,300` from whole-Kwacha integers.

#### Scenario: Rush line
- **WHEN** the lines include one of kind `rush`
- **THEN** that row uses the warning text token

#### Scenario: Money format
- **WHEN** an amount of 2650 is rendered
- **THEN** the text is `K2,650`

### Requirement: Banner
`Banner` SHALL support info, warning and success kinds with a 20px icon and a bold lead phrase. The warning kind SHALL have `role="alert"`; info and success SHALL NOT.

#### Scenario: Rush banner
- **WHEN** a warning banner is rendered
- **THEN** it has `role="alert"`

### Requirement: Order card
`OrderCard` SHALL show the reference and date with a status pill on the first line, the customer and summary on the second, and fulfilment and total on the third. When selected it SHALL use the `selected` background and a 3px brick bar on the left edge.

#### Scenario: Selected card
- **WHEN** `selected` is true
- **THEN** the card carries the selected background token and the left bar

### Requirement: Sheet
`Sheet` SHALL be a modal dialog built on the native `<dialog>` element. On phones it SHALL be a bottom sheet with a grab handle, header (reference, title, pill, 44px close button), a scrolling body and a sticky action bar. From desktop width it SHALL be a right-hand side panel. It SHALL close on Escape, on a scrim click and on the close button, and SHALL return focus to the element that opened it.

#### Scenario: Escape closes
- **WHEN** the sheet is open and the user presses Escape
- **THEN** `onClose` is called and focus returns to the opener

#### Scenario: Floating shadow
- **WHEN** the sheet renders
- **THEN** it is the only component using the float shadow token

### Requirement: Accessibility baseline
Every interactive element SHALL have a hit area of at least 44px, a visible focus ring, and a text contrast of 4.5:1 through the tokens. Every component SHALL pass an automated axe check with no violations.

#### Scenario: Axe check
- **WHEN** each component is rendered with representative props in the test suite
- **THEN** axe reports no violations

### Requirement: Development gallery
The app SHALL serve `/dev/components` rendering every component in its states. In a production build the route SHALL return 404.

#### Scenario: Production build
- **WHEN** `NODE_ENV` is `production`
- **THEN** `/dev/components` responds with 404
