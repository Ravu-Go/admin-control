# Ravu Admin UX contract

Business permissions, state transitions and privacy rules come from the private API repository's docs/admin/BRIEF.md, DECISIONS.md and openapi/admin.yaml. DESIGN.md owns the current tokens and approved header conventions. This map records existing owners; it introduces no replacement UI library.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native HTML select styled with application tokens | DESIGN.md; maintained sibling filters | Native OS keyboard and popup behavior | tests/overview.spec.ts; tests/staff-management.spec.ts |
| Form | React Hook Form + Zod for reviewed commands; design/components.tsx ConfirmDialog | API request schemas and brief confirmation/version rules | Inline account review; confirmed dialog; existing editors | tests/accounts.spec.ts; src/design/components.test.tsx |
| CRUD | staffRequest + generated API types; TanStack Query; React Router | Canonical API contract and admin-contract.lock.json | Directory/detail; versioned status command; history-preserving closure in Administration | tests/accounts.spec.ts; tests/super-admin.spec.ts |

Accounts has no bulk selection, money movement, unmasking, or executable export. Account IDs and view choices may be routed; personal contact/name search must not enter URLs. Directory filters narrow the source dataset through the server. Each review section uses shared Tabs and TabPanel. Unconnected workflow sections say so explicitly.

StaffSessionProvider clears query state on expiry/sign-out. Account confirmation drafts stay in component memory; no personal reasons are saved in persistent browser storage. Failed/uncertain writes preserve the draft and block confirmation until the server record is reloaded. A changed status requires returning to review the recorded result; reinstatement is separate. Successful retries use the same idempotency key for an unchanged payload. No optimistic account-access success is displayed.

Feedback uses inline role=status or role=alert. Forms keep labels, field errors and first-error focus. Native field controls use the existing tokens. Account reason textareas grow with content; fixed minimum height preserves the native confirmation proportions. Account decisions are attributed/audited on the server. The UI cannot grant scope.

Static premium audit findings in older auth/administration/settings forms are recorded in the phase report; this contract does not declare those findings resolved. Runtime tests remain separate from the static audit.
