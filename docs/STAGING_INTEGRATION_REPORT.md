# Admin staging integration

Combines System settings (#13), header/tab/filter consistency (#14) and the verification UI branch with the existing scoped Overview on staging. The source branches remain intact until this integration passes checks and is merged.

Conflicts were resolved by preserving Overview feature activation together with settings/audit/access routes, keeping both stylesheet additions and retaining the detailed design context alongside Overview guidance. The approved header decision governs navy action buttons and 600-weight controls. Generated API types are regenerated and locked to merged Ravu-API staging 7b2ae794c78b5cef3586f7aa6df07f5299fd974e, including company profile and Overview endpoints.

Removed the requested generator attribution from admin-control PR descriptions #10, #13 and #14. Tracked files and commit messages contain no exact matching generator footer. Existing commit authorship/history is preserved.

Validation: canonical contract, TypeScript, lint, unit, build, browser and private native-design gates are required before merging. No production promotion is included. Live staging smoke depends on browser access through Cloudflare.
