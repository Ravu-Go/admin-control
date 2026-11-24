# Admin staging deployment

Owner-selected staging hostname: `admin.ravultd.com`. This hostname serves the **staging branch**, not a production release. The API staging hostname remains unchanged.

Create a separate application inside the existing Dokploy **staging** environment:

| Setting | Value |
| --- | --- |
| GitHub repository | Ravu-Go/admin-control |
| Branch | staging |
| Build | Dockerfile at repository root |
| Docker context | . |
| Domain | admin.ravultd.com |
| Container port | 80 (HTTP) |
| TLS | Enable HTTPS certificate through Dokploy |
| VITE_APP_ENV | staging |
| VITE_DEMO_MODE | true |
| VITE_API_BASE_URL | https://staging-api.ravultd.com |
| Health path | /health |

Connect the existing GitHub integration; do not select main. Add the hostname's DNS record to the existing VPS ingress and allow certificate issuance. Do not alter the API application, database or production domains.

Only deploy commits that passed the Admin UI workflow. A merge alone is not evidence of a successful deployment. Record the deployed commit from Dokploy, check `/health`, then run `STAGING_URL=https://admin.ravultd.com npm run test:e2e` and attach the results. Playwright follows the deployed app through deep links and compares the shell with the native reference.

On a failed smoke test, roll this application back to its previous healthy deployment in Dokploy. Do not run backend migrations from this static frontend container.

Branch protection for both `main` and `staging`: require PRs, require `quality`, `browser`, `secrets` and `private-design-visual`, require the branch to be current before merging, block force pushes and deletion. Preserve main/staging. After a successful squash merge, delete only the merged `admin/phase-*` branch.

The Phase 3 shell has no live API actions, staff authentication or feature screens. Phase 4 adds those foundations before any operational module is connected.
