# Ravu Admin Control Centre

Staff console built with **React 18 + TypeScript strict + Vite**, following the binding [brief](https://github.com/Ravu-Go/Ravu-API/blob/staging/docs/admin/BRIEF.md). Backend code and canonical OpenAPI stay in Ravu-API. This repository contains only the frontend.

Phase 3 provides the shared design system, shell and fictional component playground. Operational areas are explicit placeholders pending Phase 4 staff authentication, MFA, permissions and audit. There are no live actions in the playground.

Use Node 24 and npm:

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run verify:contract
npm run build
npx playwright install chromium
npm run test:e2e
```

Environment variable names: `VITE_APP_ENV`, `VITE_DEMO_MODE`, `VITE_API_BASE_URL`. Vite values are public build configuration; never put credentials in a VITE variable. Nonproduction builds always display the demo notice. Production with demo disabled deliberately gates this unfinished shell.

Playground routes: `/` (shared components) and `/playground/states` (A28 reusable states). Sidebar destinations exist as explicit unconnected placeholders. `/` retains A01 chrome for visual verification; the operational overview is a later phase.

## Design provenance and differences

The saved A01/A28 PNGs and the matching archived design scripts supplied the exact palette and geometry. Figma MCP returned its plan quota limit; no Figma AI was used. Native variable/component bindings remain unverified. Tokens live in `src/design/tokens.json`, are exported through `tokens.ts`, generate CSS variables and feed Tailwind. Original navigation SVG paths were extracted without executing the archive's file-writing scripts. The mobile menu and check/clock utility icons use simple SVG paths.

The native 1440×1042 PNG contains a 42px external frame label and a 1440×1000 application surface. The shell test crops that label and masks only the unimplemented operational content (x224/y176/w1216/h788). It compares navigation, topbar, title/subtitle and demo footer against the original PNG, never a screenshot regenerated from our app. Small text on pale backgrounds uses the documented accessible muted variant `#626E84` (4.80:1 on the page background), replacing `#69758B` there (4.34:1). The component playground occupies the masked area and is deliberately distinct from a feature screen.

Native screenshots remain private in Ravu-API. Public frontend CI checks interactions, accessibility and shell geometry. The separate `private-design-visual` merge gate requires the private API CI comparison of the pinned frontend commit against the original native PNG. Its artifacts stay private too. `scripts/prepare-visual-reference.mjs` accepts the private source path and refuses output inside this public checkout; it never regenerates a reference from the running app. `npm run test:visual:private` requires `PRIVATE_VISUAL_REFERENCE_DIR` and fails without the original baseline. The original icon sprite can be regenerated separately with `scripts/prepare-reference.mjs` from an authorised archive checkout.

## API contract

`src/api/generated/admin.ts` is generated with openapi-typescript from `openapi/admin.yaml` at the pinned API commit in `admin-contract.lock.json`. No duplicate handwritten API types exist. The private canonical YAML is not copied into this public frontend repository. After fetching that exact source with authorised GitHub access:

```sh
npm run generate:api -- /authorised/path/admin.yaml -o src/api/generated/admin.ts
node scripts/lock-contract.mjs /authorised/path/admin.yaml c75119ffce09db6bc28f3ac423eaab99bffe4676
npm run verify:contract
```

CI verifies the generated file hash against the lock; it does not independently fetch the private API repository. Contract updates require the API PR to merge first, followed by a new pinned source commit/hash and regenerated types here. A source-hash check cannot replace review of that authorised regeneration.

The frontend does not seed a database. Backend fictional seed commands and reports belong in Ravu-API. No real personal data, evidence, mobile-money PINs or card details belong in frontend fixtures.

## Staging workflow

Branch from current `staging` into `admin/phase-N-description`. Conventional commit, PR into staging, green quality/browser/secrets checks and the private native-design visual check, squash merge, verify the deployed staging commit and Playwright smoke, then delete the merged work branch. Preserve `main` and `staging`; production promotion requires explicit owner sign-off. The README-only initial main commit bootstrapped this originally empty repository; no app code was committed directly to main.

Owner-selected hostname: **admin.ravultd.com**, serving staging. See [Dokploy settings](deploy/DOKPLOY.md). Deployment and branch-protection configuration must be verified in the external services; source files alone do not establish them.

Draft persistence is session-scoped and only accepts non-sensitive copy. Callers must scope draft keys to staff/session/record, clear them on sign-out/expiry, and re-fetch record versions on reconnect. No action is retried automatically. Confirmation retries retain their idempotency identity for unchanged input. Backend policies and audits remain mandatory in Phase 4.

## Staff login and branding update

The owner requested the Ravu logo, removal of “Demo workspace” and “Admin · Demo”, and a sign-in landing page before admin content. The existing company logo is reused unchanged from the API's public Swagger branding asset; it is not a Figma screenshot. The staging data notice remains required by the brief.

Unauthenticated visitors to any console route are redirected to `/login`, preserving only allowlisted internal destinations. The UI restores a session only from the canonical staff bootstrap endpoint. Sign-in uses Sanctum CSRF cookies and credentialed requests to the contracted staff login/MFA/logout endpoints. Passwords and MFA codes remain in form memory and are cleared after submission; no local-storage login flag, bearer-token fallback, fake credential acceptance or preview bypass exists. Expired sessions are removed and failed logout does not claim server-side success.

Staff cookie sessions, mandatory authenticator verification, email-verified password changes and critical-action reauthentication are implemented in the API. Generated types are pinned to the merged API revision recorded in `admin-contract.lock.json`. Backend role/object policies and exhaustive audit coverage remain Phase 4 work; business feature screens remain disconnected.

The original private native screenshot is retained. `tests/private/approved-differences.json` records the exact owner-approved branding/text regions excluded from the old A01 comparison; unchanged navigation and chrome remain compared. Logo visibility, removed labels and authenticated role display are asserted separately. Login desktop/mobile review captures and native design comparisons stay in private API CI. No new native login frame was supplied; the new page uses the established Inter/navy/blue tokens.

## Critical-action identity verification

Use `CriticalActionDialog` after the existing reason and explicit confirmation flow. Pass the canonical action, a localised action label and a context key containing record identity and the opened version. Permission loss, session expiry, cancellation and context changes block continuation. The callback receives action/expiry only; the server still enforces a single-use proof, object scope, version, audit and maker/checker. Do not automatically retry commands. Credential fields clear after submission.

The nonproduction `/playground/reauthentication` route previews only the shared form with fictional inputs. It makes no authentication or business request and cannot bypass normal staff login or enable a feature screen. Production critical actions use the real API wrapper, never the preview handler.
