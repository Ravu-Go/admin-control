# Phase 5 — Operations overview (A01)

The first feature slice consumes get_overview from a pinned merged Ravu-API contract. It preserves the existing shell, supplied branding and Figma A01 layout, with four KPIs, registration and receipt charts, user breakdown, current memberships and recent registrations. Filters are kept in the URL; queries are cancelled on filter changes and refreshed every minute. Expired sessions clear through the shared session provider. Permission failures hide cached figures, errors never become zero totals and background failures label the last successful snapshot. EN/SW copy, EAT dates and scale-100 TZS formatting follow the canonical API.

Export remains disabled with an explanation until the separately planned report-export workflow is implemented. This slice performs GET reads only. It creates no role grants, financial events or live accounts. Charts use the server's actual scoped data. The backend enabled_features flag activates the screen after the API implementation is available.

Validation, canonical contract revision, browser/visual evidence and staging deployment results are recorded after execution. Production promotion requires separate owner authorization.

API: https://github.com/Ravu-Go/Ravu-API/pull/32 merged into staging at 60c859b5aa9d4d9789911311fbeddef46c5ff8da with required fast, target-stack, security and private visual checks green. Generated types are locked to that revision.

Local: TypeScript passed; ESLint passed with the existing TanStack Table compiler warning. All 70 unit tests passed with two workers after an existing MFA test exceeded the default timeout under local parallel contention. Build and contract verification passed. The build reports a large shared chunk; route splitting remains a performance-gate item. The initial browser attempt could not launch due to an absent libasound runtime lookup; rerunning uses the existing /tmp/ravu-libs bundle without altering the application or CI. Browser results and staging evidence follow.

Design differences to A01: KPI labels distinguish membership receipts from driver fares, totals have explicit reporting periods, refresh cadence is stated honestly, and registrations use account IDs without exposing names or contacts. Export is disabled until its permissioned, audited workflow is implemented. Existing shell branding is preserved.
