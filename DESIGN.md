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

<!-- impeccable:design-map -->
Name: Ravu Admin Control Centre
Colors: primary: signal-blue #315BFF; secondary: sky-data #6BADFF; neutral: control-navy #040D35; state: success-green #117B56; neutral: ink-navy #111D38; neutral: slate-muted #69758B (+7 more in the sidecar)
Fonts: Inter (headline, title, body, label, caption)
Spacing: xs 4px, sm 8px, md 12px, lg 16px, xl 24px, page 32px
Radius: badge 8px, button 10px, navigation 12px, profile 14px, card 16px
North Star: "The Control Room"
Rules:
- The One Action Colour Rule. Signal blue is reserved for interaction and data.
- The Label-With-Colour Rule. State is always carried by an icon plus text; colour only reinforces it.
- The Two-Weight Rule. Inter at 400 and 700 only.
- The Flat Panel Rule. Panels, cards and KPI tiles never cast shadows.
Elevation:
- Modal lift: 0 24px 64px color-mix(in srgb, var(--color-navy) 30%, transparent)
Don't:
- Don't add shadows to panels, cards or KPI tiles.
- Don't signal state with colour alone, or use slate muted for text on pale fills.
- Don't turn an error into a zero value, or show fabricated live results outside the labelled fictional playground.
- Don't use Figma AI or redraw the Figma references; deviations from them are logged in the API repository's DECISIONS.md.
Do:
- Do read colours, radii and spacing from the generated CSS variables (`--color-*`, `--radius-*`); edit `src/design/tokens.json`, never hard-coded hex in components.
- Do reuse the canonical owners: AppShell/PageHeader for chrome, `src/design/components.tsx` for buttons, panels and KPI cards, `src/design/States.tsx` for loading and recovery, and the shared PasswordInput and VerificationCodeInput for credentials.
- Do keep all-time, selected-period and current-snapshot labels distinct, and show loading, denied, expired, stale and retry states with the existing shell conventions.
- Do verify at 1440px desktop and 390px mobile, in English and Swahili, by keyboard, and with axe.
Map: src/design/tokens.json
Map: scripts/tokens.mjs
Full: .impeccable/design-full.md (read a section when you need its detail)

## Integrated overview and header context

The API repository's docs/admin/BRIEF.md and private Figma A01–A28 references own the layout and business states. Runtime tokens are generated from src/design/tokens.json through scripts/tokens.mjs into tokens.ts and tokens.css. Preserve the supplied logo, Inter typography, navy sidebar, light canvas, bordered white panels, existing radii and blue/navy/sky data series. This feature introduces no visual token changes.

Canonical UI owners are AppShell/PageHeader for navigation and page chrome, design/components.tsx for buttons/panels/KPI cards, design/States.tsx for loading/recovery, StaffSessionProvider for authenticated session state, staffRequest for cookie/CSRF transport, TanStack Query for cancellation/cache and i18next for EN/SW. Native HTML selects own filter keyboard and popup behavior; closed controls use application tokens. Overview URL filters contain reporting period, audience and permitted-area ID. Backend scope is authoritative.

A01 uses four KPI columns, two time-series panels and three lower panels at desktop size, reflowing at narrow widths. All-time, selected-period and current snapshot labels remain distinct. Monetary storage/transport uses integer minor units; display formatting divides at the UI boundary. Loading, denied, expired, stale and retry states reuse the established shell conventions. Errors never become zero values.

Verify against the private A01 reference at 1440px desktop, 390px mobile, both languages, keyboard, empty/error/denied states and axe. Shared shell geometry and behavior remain covered by existing tests.

The approved header-system decision in API docs/admin/DECISIONS.md governs buttons and tabs: primary actions use sidebar navy, blue remains for links/focus/data, and header control labels use 600 weight. These specific controls take precedence over older generic action-colour and two-weight notes above.
