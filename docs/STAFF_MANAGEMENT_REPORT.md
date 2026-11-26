# Staff and role administration

The A22 administration route now reads the real staff directory, full role catalogue, operating areas, access requests, invitations and staff sessions. It supports invitations, role creation and permission management, staff access/suspension changes, independent request review and revocation of invitations or sessions. Invitation acceptance sets a password and then requires normal sign-in and mandatory MFA enrollment.

Every mutation requires a reason, explicit confirmation, fresh password/TOTP authentication, an idempotency key and current record versions. Requests do not grant access until a different administrator approves. The operator-created super-administrator role is protected; approved default template grants and names remain fixed. There are no real invitations or named staff grants in this change.

The UI follows the A22 reference structure using the existing shared shell, tokens, tables and confirmation components. The capability matrix displays actual canonical role/permission data rather than the reference's abbreviated example. Request, session and invitation controls reflect the implemented approval requirements. Screens and controls support English and Swahili; timestamps use EAT. Private CI attaches desktop/mobile screen and invitation-form evidence; the existing native shell snapshot check remains unchanged.

Verification must pass for the final source revision before merging into staging. Generated types and the contract lock must identify the merged canonical API revision. Production promotion remains a separate owner decision.

Activation requires an existing administrator with explicit global access scope and a second independently owned administrator for approvals. Existing accounts receive no implicit scope backfill. An operator can review the staging-only `ravu:grant-super-admin-scope` recovery command after deployment; it never creates a new role or grants additional permissions.
