# Super administrator management

Owner-authorized extension to A22: verified bootstrap is_super_admin plus access.manage and access.approve enables direct role/staff changes and the Users tab. Role display names do not control the mode. Normal admins still submit changes for independent review. Protected operator roles and self-lockout guards remain on the server.

The Add admin or staff flow selects an enabled role and scope; confirmation, reason and fresh single-use MFA precede the audited direct command. Invitation acceptance still requires personal password setup, sign-in and authenticator enrollment. Existing pending requests can be reviewed by the super administrator, including their own.

The Users tab lists masked contacts with server pagination/type filtering and creates riders, drivers and partners. Creation requires confirmation/reason/fresh MFA and an idempotency key. No shared password field is exposed: the recipient receives a one-use setup link. Phone and business eligibility remain unverified; no automatic session or console grant is issued. Member setup directs recipients to the Ravu app. All new UI copy supports English/Swahili and uses the existing A22/shared dialog and login layouts.

Generated types must be pinned to the merged canonical API contract. Browser regressions exercise direct owner invitations, own-request review, all three member creation flows, ordinary-admin visibility, mobile accessibility and member setup. Private screenshot evidence covers desktop/mobile directory, editor and setup; artifacts remain in the private API repository. Staging only; no real users/invitations are created by delivery.
