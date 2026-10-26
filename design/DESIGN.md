# Giuseppe's Cakes: Design System v1.1

These are the design rules for the Giuseppe's Cakes booking app (Next.js on Vercel). They cover the customer booking flow and the owner dashboard.

If you are using an AI coding tool, put this file in the repo root. You can also paste it into `CLAUDE.md`, `.cursor/rules`, `AGENTS.md`, or v0's project instructions. The tool should follow it for every UI change.

## Files

| File | Purpose |
|---|---|
| `tokens.css` | Every colour, font, radius and spacing value as a `--gc-*` CSS variable, in light and dark. This file is the single source of truth. |
| `tailwind-theme.css` | Maps the tokens to Tailwind v4 utilities (`bg-bg`, `text-ink`, `bg-brand`, `border-line`, `font-display` and so on). |
| `tokens.json` | The same tokens in W3C DTCG format, for Figma Tokens Studio and Style Dictionary. |
| `components/ThemeToggle.tsx` | A light/dark switch that remembers the visitor's choice. |
| `components/StatusPill.tsx` | The six order statuses. |
| `logo.png` | The full logo lock-up. |

## Setup (Next.js App Router)

1. Copy `tokens.css` and `tailwind-theme.css` into `app/`, and put `@import "./tailwind-theme.css";` in `app/globals.css`.
2. Load the fonts with `next/font/google`. Use `Cormorant_Garamond` (weights 400, 500, 600, normal and italic) and `Inter` (weights 400, 500, 600). Point `--gc-font-display` and `--gc-font-sans` at them.
3. To stop a flash of the wrong theme on page load, add this inline script to `<head>` before paint:
   `<script dangerouslySetInnerHTML={{__html:"try{var t=localStorage.getItem('gc-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}"}} />`
   Also add `suppressHydrationWarning` to `<html>`.

## Non-negotiables

- **Colour comes from tokens only.** Never hard-code a hex value in a component. If you need a new colour, add a token with a light and a dark value, and check that it passes 4.5:1 contrast.
- **One Cormorant moment per screen.** This means one display headline, one italic celebratory word, or the order total. Everything functional uses Inter: forms, buttons, tables, the dashboard. Owner screens use Inter only.
- **Hairlines, not shadows.** Resting surfaces are `bg-surface` with a 1px `border-line`. `--gc-shadow-float` is only for things that float: bottom sheets, menus, popovers and toasts.
- **One filled brick button per screen.** The secondary action uses the ghost style (1px `ink` border on a transparent background).
- **Brick has two roles.** `brand` is for fills. `brand-ink` is for text and icons on the background, because it lifts to a lighter rose in dark mode.
- **Gold is never used for text.** It is for ornament rules and the `gold-wash` background only.
- **Avoid:** bento grids, purple or any gradients, heavy drop shadows, emoji, and left-border "accent cards". The one exception is the 3px brick bar on the selected order row.
- **Mobile first.** Touch targets are at least 44px. Primary buttons are 52px tall and full width on phones. Inputs are 48px tall with 16px text, so iOS doesn't zoom in.

## Components

- **Button, primary:** `h-[52px] rounded-md bg-brand text-on-brand font-semibold hover:bg-brand-hover`. On focus, add the `--gc-focus-ring` plus a 2px ground offset. When disabled, use `bg-line text-disabled-ink`.
- **Button, ghost:** `border border-ink text-ink bg-transparent`, at the same height.
- **Input:** `h-12 rounded-sm border border-line-strong bg-surface px-3.5 text-base`. On focus, use `border-brand` plus the focus ring. On error, use `border-err-ink` and show helper text in `text-err-ink` with an icon. The label always sits above the field and stays visible.
- **Radio card** (delivery or pickup): two cards in a 2-column grid with `rounded-md border border-line-strong bg-surface p-4`. When selected, use a `1.5px border-brand` and a `brand-ink` icon. It is a real `<input type="radio">` inside a `<label>`.
- **Add-on checkboxes:** a single bordered list with `divide-y divide-line`. Each row is at least 52px tall and the price sits on the right in tabular figures. Use `accent-color: var(--gc-brand)`.
- **Date picker:** Show the month name in Cormorant. Mark rush days (less than 5 days away) with `bg-warn-bg text-warn-ink`. Show fully booked days with a strikethrough in `disabled-ink`, past days in `past`, and the selected day as a brick-filled circle.
- **Stepper:** On phones, use the overline label "Step 2 of 4 · Details" over four 3px segments (`brand` for done, `line` for to-do). From tablet width up, use numbered circles with labels joined by 1px lines.
- **Summary card:** `bg-surface border-line rounded-md`. Line items sit in `<dl>` rows separated by hairlines. Show the rush fee in `warn-ink`. The total row uses `bg-gold-wash`, with the amount in Cormorant at 34px. The deposit line goes below it.
- **Status pills:** these are rounded pills (`rounded-full`), 26–28px tall, and always show a dot plus a word except Completed, which shows a check mark. The colours for each status:

  | Status | Background | Text |
  |---|---|---|
  | New | `gold-wash` | `gold-ink` |
  | Awaiting quote | `gold-wash` | `gold-ink` |
  | Awaiting payment | `warn-bg` | `warn-ink` |
  | Awaiting verification | `info-bg` | `info-ink` (the dot is a hollow ring) |
  | Confirmed | `ok-bg` | `ok-ink` |
  | Completed | outlined in `line-strong` | `ink-soft` (with a check mark instead of a dot) |
  | Expired | `err-bg` | `err-ink` |

- **Banners:** `rounded-md p-3.5`, with a 20px stroke icon and a bold lead phrase. The three kinds are info (`info-bg`), warning or rush (`warn-bg`, with `role="alert"`) and success (`ok-bg`).
- **Order card:** `bg-surface` with hairline row dividers. Each card shows the ID and date (12px `ink-soft`) and a pill on the first line, the customer and cake (600 weight) on the second, and fulfilment and total on the third. The selected card uses `bg-selected` plus a 3px left bar in `brand`.
- **Bottom sheet:** `rounded-t-lg bg-surface shadow-float` over `bg-scrim`. From top to bottom it has a 40×4 grab handle, a header (ID, title, pill, 44px close button), a scrolling body of hairline `<dl>` rows, and a sticky action bar with one ghost and one primary button in a 1fr/2fr split. On desktop it becomes a right-hand side panel.

## Type scale

| Token | Spec |
|---|---|
| display-xl | Cormorant 56/60, italic |
| display | Cormorant 40/44 |
| title | Cormorant 28/32, weight 500 |
| heading | Inter 18/26, weight 600 |
| body | Inter 16/24 |
| label | Inter 14/20, weight 500 |
| overline | Inter 12/16, weight 600, uppercase, +0.14em letter spacing |

## Dark mode

Toggle dark mode with `class="dark"` or `data-theme="dark"` on `<html>`. With neither set, it follows the OS setting. The dark ground is warm cocoa (#1B1714), not black.

Never use `dark:` colour overrides in components. Components only reference tokens, and the tokens do the swapping.
