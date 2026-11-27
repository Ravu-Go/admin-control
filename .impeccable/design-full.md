---
name: Ravu Admin Control Centre
description: Staff operations console for Ravu accounts, journeys and partner services.
colors:
  control-navy: "#040D35"
  ink-navy: "#111D38"
  signal-blue: "#315BFF"
  sky-data: "#6BADFF"
  slate-muted: "#69758B"
  slate-accessible: "#626E84"
  hairline: "#E6EAF1"
  canvas-mist: "#F5F7FC"
  focus-pale: "#EFF3FF"
  surface-white: "#FFFFFF"
  success-green: "#117B56"
  warning-amber: "#C79839"
  danger-red: "#B33126"
typography:
  headline:
    fontFamily: "Inter, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: "36px"
  title:
    fontFamily: "Inter, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "24px"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 700
  caption:
    fontFamily: "Inter, sans-serif"
    fontSize: "10px"
    fontWeight: 700
rounded:
  badge: "8px"
  button: "10px"
  navigation: "12px"
  profile: "14px"
  card: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  page: "32px"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.surface-white}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "10px 16px"
    height: "42px"
  button-secondary:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "10px 16px"
    height: "42px"
  button-danger:
    backgroundColor: "{colors.danger-red}"
    textColor: "{colors.surface-white}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "10px 16px"
    height: "42px"
  panel:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.card}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.button}"
    padding: "10px 14px"
    height: "48px"
  status-badge:
    backgroundColor: "{colors.canvas-mist}"
    textColor: "{colors.ink-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.badge}"
    padding: "4px 8px"
  nav-item-active:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.control-navy}"
    rounded: "{rounded.navigation}"
    height: "40px"
  verification-slot:
    backgroundColor: "{colors.canvas-mist}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.button}"
    height: "54px"
---

# Design System: Ravu Admin Control Centre

## Overview

**Creative North Star: "The Control Room"**

A calm, high-trust operations desk. Navy chrome frames the work, white bordered panels hold it, and blue appears only where there is an action to take or data to read. Staff use this console to change real people's access, money and journeys, so every surface favours legibility, precision and an obvious next step over expression.

Density is operational rather than decorative: four-column KPI rows, matrices and tables at desktop width, reflowing to a single column on phones. Depth comes from hairline borders and tonal layering on a pale canvas, not from shadows. Critical actions are deliberately slower: a confirmation with an audit reason, then a fresh password and authenticator check.

Authority: the API repository's `docs/admin/BRIEF.md` and the private Figma A01–A28 references own layout and business states. Runtime tokens are generated from `src/design/tokens.json` by `scripts/tokens.mjs` into `tokens.ts` and `tokens.css`; components read only those CSS variables. Preserve the supplied logo, Inter typography, navy sidebar, light canvas, bordered white panels, the radius scale and the blue/navy/sky data series.

**Key Characteristics:**
- Navy sidebar (224px) and white 80px top bar around a mist-grey canvas.
- Flat, 2px-bordered white panels with 16px corners; no resting shadows.
- One action colour (signal blue); semantic colours only for state.
- Every status shows an icon and a label, never colour alone.
- English and Swahili at every breakpoint; times shown in EAT.

## Colors

A cool navy-and-mist palette with one saturated action blue and three semantic state colours.

### Primary
- **Signal Blue** (#315BFF): primary buttons, links, focus rings, the active navigation marker and the main data series. If it is blue, it can be pressed or it is data.

### Secondary
- **Sky Data** (#6BADFF): the secondary chart series and small labels on the navy sidebar (profile sub-text, footer).

### Neutral
- **Control Navy** (#040D35): sidebar, login brand panel and modal backdrops (at 55% over the page).
- **Ink Navy** (#111D38): body text, headings and the sidebar profile card.
- **Slate Accessible** (#626E84): secondary text, descriptions and placeholders. Use this, not Slate Muted, on pale surfaces; it is the documented contrast adjustment.
- **Slate Muted** (#69758B): decorative or icon-only muted tone; never body copy on pale fills.
- **Hairline** (#E6EAF1): every border, divider and inactive input stroke.
- **Canvas Mist** (#F5F7FC): the page canvas, table zebra rows and code-slot fills.
- **Focus Pale** (#EFF3FF): notices and the active verification slot.
- **Surface White** (#FFFFFF): panels, dialogs, inputs and the top bar.

### State
- **Success Green** (#117B56), **Warning Amber** (#C79839), **Danger Red** (#B33126): status badges, destructive buttons and SOS. Warning amber colours the icon, never body text.

### Named Rules
**The One Action Colour Rule.** Signal blue is reserved for interaction and data. Never use it for decoration or as a heading colour.

**The Label-With-Colour Rule.** State is always carried by an icon plus text; colour only reinforces it.

## Typography

**Display Font:** Inter (with sans-serif)
**Body Font:** Inter (with sans-serif)

**Character:** One family in two weights (400 and 700). Hierarchy comes from size and weight steps, not from new faces.

### Hierarchy
- **Headline** (700, 30px, 36px): page titles in the page header; 24px at 600px and below. Login titles run 32px with -0.03em tracking.
- **Title** (700, 18px, 24px): panel headings; dialog titles at 20–22px.
- **Body** (400, 14px, 1.5): table cells, descriptions and form text. Inputs use 16px on phones to prevent zoom.
- **Label** (700, 12px): buttons, form labels, badges and tab text.
- **Caption** (700, 10px): sidebar footer and demo-data stamps only.

### Named Rules
**The Two-Weight Rule.** Inter at 400 and 700 only. A new weight or face needs a design decision, not a component tweak.

## Layout

A fixed 1440 × 1000 reference canvas: 224px navy sidebar, an 80px white top bar, and a 32px page gutter on the mist canvas. Spacing steps are 4, 8, 12, 16, 24 and 32px. Panels stack with 24px between them.

The A01 overview uses four KPI columns, two time-series panels and three lower panels at desktop size. Tables and matrices scroll horizontally inside their panel rather than squeezing columns.

Breakpoints step down at 1100, 900, 760, 640, 600 and 480px. At 1100px and below the sidebar becomes an off-canvas menu behind a menu button; at 600px and below the SOS pill leaves the top bar and page titles drop to 24px. At 760px and below, toolbars and panel tools stack vertically, and tab buttons share the width equally. Modal forms keep a 16px (desktop) or 12px (phone) margin from the viewport edge.

## Elevation & Depth

Flat by default. Depth comes from tonal layering (white panels on the mist canvas) and 2px hairline borders. The one shadow belongs to modal layers, which sit over a translucent navy backdrop with a light blur so the page stays visible behind them.

### Shadow Vocabulary
- **Modal lift** (`box-shadow: 0 24px 64px color-mix(in srgb, var(--color-navy) 30%, transparent)`): dialogs and popup forms only.

### Named Rules
**The Flat Panel Rule.** Panels, cards and KPI tiles never cast shadows. Only modal layers do.

## Shapes

Gently rounded and consistent: badges 8px, buttons and inputs 10px, navigation items 12px, the profile card 14px, panels and dialogs 16px. Borders are 2px Hairline on panels and inputs, and 1px on dividers and code slots. A small vertical blue tick (3 × 20px, 2px radius) marks the active navigation item.

## Components

### Buttons
- **Shape:** gently curved (10px), at least 42px tall, 12px bold label.
- **Primary:** signal blue fill, white text. One per form or dialog.
- **Secondary:** white fill, ink text, 2px hairline border. Cancel, filters and table actions.
- **Danger:** danger red fill, white text. Revoke, reject and other irreversible actions, always behind a confirmation.
- **Focus:** 3px signal-blue outline at 3px offset on every focusable element. Disabled buttons keep their shape and lose contrast; they never disappear.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** surface white on canvas mist.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 2px hairline.
- **Internal Padding:** 24px; 20px on phones.

### Inputs / Fields
- **Style:** white fill, 2px hairline stroke, 10px radius, 48–50px tall, 14px horizontal padding; placeholders in slate accessible.
- **Password fields:** a shared password field with a Show/Hide text toggle on the right. It hides the value again on submit.
- **Verification codes:** six mist slots (54px tall, 48px on phones) over one native input that keeps paste and one-time-code autofill. The current slot takes a 2px blue border on focus-pale; invalid codes turn every slot's border danger red.
- **Error:** a danger-red message under the field with `role="alert"`; the field sets `aria-invalid`.

### Navigation
- **Sidebar:** navy, grouped OPERATIONS / ECOSYSTEM / MANAGEMENT. Items are 40px tall with 12px corners and white text. The active item is a white pill with navy bold text and a blue tick. Items the user has no permission for are shown at 50% opacity and cannot be activated.
- **Top bar:** white with a 2px hairline bottom border, global search, SOS pill, EN/SW switch and role chip.
- **Narrow screens (1100px and below):** the sidebar becomes an off-canvas menu opened from the top bar.

### Status Badge
Mist fill, 8px corners, 12px bold label with a leading icon. Success, pending (amber icon, ink text), danger and neutral variants. Never colour alone.

### Modal Forms and Critical Actions
Staff forms (invite, role, user creation) open as 600px popups over the translucent navy backdrop, with a title row and a close button. Critical changes then pass through a confirmation dialog (reason of at least 10 characters plus a checkbox) and an identity check (password plus authenticator code). Focus starts on the first field and Escape cancels.

## Do's and Don'ts

### Do:
- **Do** read colours, radii and spacing from the generated CSS variables (`--color-*`, `--radius-*`); edit `src/design/tokens.json`, never hard-coded hex in components.
- **Do** reuse the canonical owners: AppShell/PageHeader for chrome, `src/design/components.tsx` for buttons, panels and KPI cards, `src/design/States.tsx` for loading and recovery, and the shared PasswordInput and VerificationCodeInput for credentials.
- **Do** keep all-time, selected-period and current-snapshot labels distinct, and show loading, denied, expired, stale and retry states with the existing shell conventions.
- **Do** verify at 1440px desktop and 390px mobile, in English and Swahili, by keyboard, and with axe.

### Don't:
- **Don't** add shadows to panels, cards or KPI tiles.
- **Don't** signal state with colour alone, or use slate muted for text on pale fills.
- **Don't** turn an error into a zero value, or show fabricated live results outside the labelled fictional playground.
- **Don't** use Figma AI or redraw the Figma references; deviations from them are logged in the API repository's DECISIONS.md.
