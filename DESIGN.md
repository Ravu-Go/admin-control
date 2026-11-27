# Ravu Admin design context

The API repository's docs/admin/BRIEF.md and private Figma A01–A28 references own the layout and business states. Runtime tokens are generated from src/design/tokens.json through scripts/tokens.mjs into tokens.ts and tokens.css. Preserve the supplied logo, Inter typography, navy sidebar, light canvas, bordered white panels, existing radii and blue/navy/sky data series. This feature introduces no visual token changes.

Canonical UI owners are AppShell/PageHeader for navigation and page chrome, design/components.tsx for buttons/panels/KPI cards, design/States.tsx for loading/recovery, StaffSessionProvider for authenticated session state, staffRequest for cookie/CSRF transport, TanStack Query for cancellation/cache and i18next for EN/SW. Native HTML selects own filter keyboard and popup behavior; closed controls use application tokens. Overview URL filters contain reporting period, audience and permitted-area ID. Backend scope is authoritative.

A01 uses four KPI columns, two time-series panels and three lower panels at desktop size, reflowing at narrow widths. All-time, selected-period and current snapshot labels remain distinct. Monetary storage/transport uses integer minor units; display formatting divides at the UI boundary. Loading, denied, expired, stale and retry states reuse the established shell conventions. Errors never become zero values.

Verify against the private A01 reference at 1440px desktop, 390px mobile, both languages, keyboard, empty/error/denied states and axe. Shared shell geometry and behavior remain covered by existing tests.
