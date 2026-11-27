# System settings: app configuration

**Where:** Administration → System settings (`/administration/settings`), next to Staff & roles. Opening it needs `settings.read`; changing anything needs `settings.manage`.

**What it edits:** the company profile that the apps, the website and this console share.
- **Logo:** PNG, JPEG or WebP, up to 2 MB and 4096 px, with no SVG. The file is checked in the browser before upload and previewed on navy and light backgrounds. It can be replaced or removed.
- **App details:** app name, support email, support phone (E.164, for example `+255700000000`) and office address. Changing the address clears any stored map coordinates.

**How changes are made:** every change (details, logo upload, logo removal) passes through a reason-and-confirm dialog, then a fresh password and authenticator check for `settings.manage`. It is then sent once with an idempotency key and the opened version. A stale version returns a conflict and nothing is saved. Staff without `settings.manage` see the values read-only.

**Where it applies:**
- **This console:** the sidebar, sign-in and invitation pages show the configured logo in a white tile, and the browser tab title uses the configured app name. If the public profile is unavailable, the console falls back to the built-in Ravu logo and name.
- **Apps and the website:** they read `GET /api/v1/company-profile` and `GET /api/v1/company-profile/logo` on the API.
- **CSP:** `deploy/nginx.conf` now allows images from the API origin so the logo can load.

**Contract:** generated types pin Ravu-API `admin/phase-4-company-profile` at `f0bd7d8ed2fa709f8820324c0bad467319a3389c` (console contract 0.1.5). After that API PR is squash-merged, regenerate the types and re-lock to the merged SHA before merging this one:

```
git -C ../Ravu_API show <merged-sha>:openapi/admin.yaml > /tmp/admin.yaml
npx openapi-typescript /tmp/admin.yaml -o src/api/generated/admin.ts
node scripts/lock-contract.mjs /tmp/admin.yaml <merged-sha>
```

**Verification:**
- Three new Playwright specs cover validation, confirmation and re-authentication with a single idempotent save, the browser-side logo checks, multipart upload and removal, read-only access, axe, and no horizontal overflow at 390px.
- Desktop (1440) and phone (390) screenshots were checked locally.
- Unit and end-to-end suites pass. A few existing timing-sensitive tests timed out only while the machine was under load from other sessions; they pass on rerun.
