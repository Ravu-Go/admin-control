import fs from 'node:fs';
import crypto from 'node:crypto';
const lock = JSON.parse(fs.readFileSync(new URL('../admin-contract.lock.json', import.meta.url), 'utf8'));
const types = fs.readFileSync(new URL('../src/api/generated/admin.ts', import.meta.url));
if (crypto.createHash('sha256').update(types).digest('hex') !== lock.generated_sha256) throw new Error('Generated API types changed. Regenerate from the pinned canonical API contract and update its lock.');
if (!/^[a-f0-9]{40}$/.test(lock.source_commit) || lock.source_repository !== 'Ravu-Go/Ravu-API') throw new Error('Unpinned contract source.');
console.log(`Verified generated types pinned to API ${lock.source_commit}`);
