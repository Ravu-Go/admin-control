import fs from 'node:fs';
import crypto from 'node:crypto';
const source = process.argv[2];
if (!source) throw new Error('Supply a local copy of openapi/admin.yaml from pinned API staging commit 37af0b7ceb2070c7631e862830bfa7546d15326e.');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const lock = {
  source_repository: 'Ravu-Go/Ravu-API', source_commit: '37af0b7ceb2070c7631e862830bfa7546d15326e', source_path: 'openapi/admin.yaml',
  contract_version: '0.1.1', source_sha256: hash(fs.readFileSync(source)), generated_sha256: hash(fs.readFileSync('src/api/generated/admin.ts')),
};
fs.writeFileSync('admin-contract.lock.json', JSON.stringify(lock, null, 2) + '\n');
