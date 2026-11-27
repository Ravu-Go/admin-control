# Contract pin after approved API history cleanup

The owner approved rewriting API main and staging to remove automated coauthor credits. Repoint the frontend contract to rewritten merged API commit 99e8e6d169256b7d4a1628af52c27e016fae190f. The old and new canonical contract bytes are identical; source and generated hashes are unchanged. No application code or generated types change. Shared project settings disable future automated commit/PR/session attribution. Historical admin-control authorship is outside the approved API history rewrite and is preserved.

Validation: canonical byte/hash equality and npm run verify:contract. Required public and exact-source private checks govern this staging merge.
