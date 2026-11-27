## Phase 5 — Accounts A02/A03

Design: Preserved the supplied logo, navy shell, tokens and shared components. A02 uses the native directory columns and panel proportions. A03 retains the account summary/history and confirmation columns. Approved header conventions use underlined page tabs and segmented directory filters. Two bilingual reason fields, exact server blockers, a back link and clear unavailable-workflow notices extend the original copy/height; no Figma AI or canvas edits. Desktop 1440 and mobile 390 screenshots were inspected against the private native frames. Private tests assert A02 native panel position and preserve the existing A01 native pixel gate; A02/A03 are not claimed to be whole-screen pixel-identical.

Implementation: API-generated, source-pinned account directory/detail/status client; server-filtered audiences and review queue; separate account, document, membership and dispatch states; read-only review history; bilingual confirmed suspension/reinstatement with version checks, scoped permissions, CSRF, stable idempotency keys and duplicate-submit prevention. Uncertain/conflicting writes retain the draft and block retry until the current record is reloaded. No browser-persistent reason/contact storage. New shell body spacing variant applies only to Accounts; existing screens retain their layout.

Tests: 74 UI unit tests passed. Six Accounts Playwright flows passed, covering server filters, masked data, EN/SW, read-only controls, validation, one confirmed command, retained conflict drafts, pending/empty/error/retry states, desktop/mobile, keyboard focus and axe (no serious/critical violations). TypeScript and production build passed. ESLint has no errors and its existing TanStack Table compiler warning. One private Accounts visual/geometry test passed locally. Full public/private CI results are linked from the PR.

Static audit: Ran premium audit in strict mode across src. Accounts findings and native-control ownership gaps were resolved. Eight pre-existing static flags remain in generic Button/older auth/administration/settings forms (action detection through spread props, native-validation declarations and textarea sizing); they are not presented as confirmed security vulnerabilities or a clean strict audit. UX-CONTRACT.md records canonical ownership without replacing existing behavior.

Browser/API: Local Chromium and disposable fictional API fixtures only. Authenticated live staging smoke remains pending the user's MFA handoff. No live member account was mutated.

Branch / PR: admin/phase-5-accounts → staging. API contract must merge first; generated types and lock identify that exact merged API revision. Native references and comparison evidence remain in the private API workflow. Main/production promotion is excluded.

Open issues: Export and PII disclosure are unavailable. Document/trip/membership review sections clearly identify their workflows as not connected. Bilingual member-facing reasons are retained in the audit decision; message delivery is not connected or claimed. Account creation/closure remain in Administration Users with its existing safeguards. Phase 8 performance measurement at 50k accounts and route splitting remain outstanding.

Next: Verification A04/A05/A25, preserving mandatory vehicle-bound, one-year LATRA verification for bodas and bajajis, and optional insurance.

API dependency: https://github.com/Ravu-Go/Ravu-API/pull/43 merged as c0ecbf19f753769c71cf1a4a2478e8332dc0bdb6. Target-stack CI passed 322 tests / 11104 assertions; actual masked list/detail responses passed canonical schema validation. SQLite CI passed with 7 expected target-stack skips.
