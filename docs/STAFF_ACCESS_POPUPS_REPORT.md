# Staff access popups, invitation resend and shorter copy

## Changes
- **Popups.** The staff, role, invitation and member forms are modal popups over a translucent, blurred overlay. Previously the overlay was solid navy, so each form read as a separate page. Every form has a title row with a close button. Initial focus stays on the first field, and Escape still cancels.
- **Resend invitation.** Each pending or expired invitation on the Access requests tab now has a **Resend…** action. It uses the existing confirmation dialog (reason and checkbox), then a fresh identity check for `access.manage`, then `POST staff-invitations/{id}/resend` with an idempotency key and the opened version. A success status reads "Invitation resent." Revoke stays limited to pending invitations.
- **Shorter copy.** Explanatory text is trimmed. The success notice is now "Change applied." for super administrators and "Request submitted for independent review." for others. The page intro, roles note, security note, form intros and the member creation notes are shortened. Swahili translations are updated for each changed string.

## Contract
`src/api/generated/admin.ts` is regenerated from `Ravu-Go/Ravu-API` `openapi/admin.yaml` 0.1.4, which adds `resend_invitation`. The lock currently pins API branch commit `216ad15b55f18758f33f27dce330ef06c748bb6c` (branch `admin/phase-4-invitation-resend`). After that API PR is squash-merged into staging, regenerate the types and re-lock to the merged SHA before merging this PR:

```
git -C ../Ravu_API show <merged-sha>:openapi/admin.yaml > /tmp/admin.yaml
npx openapi-typescript /tmp/admin.yaml -o src/api/generated/admin.ts
node scripts/lock-contract.mjs /tmp/admin.yaml <merged-sha>
```

## Verification
- Unit tests: 67 passed. Typecheck clean. Lint shows 0 errors (the one existing `DataTable` warning is unchanged).
- Playwright: the full suite passed, with 2 new specs. One resends an expired invitation through confirmation and fresh authentication. The other checks that the forms open as closable popups on a translucent overlay, with focus on the first field.
- Visual check: desktop (1440 × 1000) and mobile (390 × 844) screenshots of the invite and role popups were reviewed locally. Screenshots are not committed.
