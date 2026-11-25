# Phase 4 - Email verification and frontend permission guards

Design: owner-requested modernization of the email OTP/password verification form using existing Inter/navy/blue tokens. Two clear steps, an email-status card, six visible digits over one native accessible input, expiry timer, resend cooldown, password visibility and explicit confirmation. Responsive desktop/mobile layout and full EN/SW copy. Figma module screens and shell geometry remain preserved; no Figma AI or feature screens.

Implementation: VerificationCodeInput supports keyboard editing, formatted paste and one-time-code autofill. PasswordChange validates the server's canonical 600-second expiry/60-second resend timing, requires fresh current-password proof to resend, blocks expired submissions, cancels departing requests, prevents duplicate requests and clears sensitive values. Only a verified logged_out API response reports completion. No credentials are stored in browser storage. Route permission keys are typed from generated API types; navigation disables inaccessible entries, SOS controls require sos.read, and direct module URLs check the same explicit grants. Account security remains available without module permissions. Server authorization remains mandatory.

Tests: 41 component/API-helper tests passed locally before the permission additions; ESLint, TypeScript and build passed (one existing TanStack compiler warning). Added browser coverage for OTP success, rejection, responsive accessibility and EN/SW, plus missing-grant navigation/direct-URL denial. The local browser server stalled in the Windows sandbox; full browser and native visual checks remain required in CI. Final current-revision checks and exact counts are recorded in the PR.

Browser/API: fictional API fixtures only. Screenshots attach to the existing browser test artifact. No live password change, real email or staff-role change is performed.

Branch / PR: admin/phase-4-email-verification, based on staging 97fccb6b333a213bc3e54ac1db981743aa069c18; target staging. API contract is unchanged; generated types retain their canonical pin.

CI: preserve quality, browser, secrets, container and private native visual checks. Merge the related API audit foundation before this frontend change. Never bypass a failed check.

Deployment: staging only after green CI, followed by public login/health smoke checks and authenticated verification where access is available. Production is not promoted.

Open issues: no named staff assignment or enabled business module is introduced. Phase 4's remaining per-object/scope policies and staging acceptance are tracked in the API report.
