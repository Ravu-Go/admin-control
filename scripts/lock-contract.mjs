import fs from 'node:fs';
import crypto from 'node:crypto';
const source = process.argv[2];
const commit = process.argv[3];
if (!source || !/^[a-f0-9]{40}$/.test(commit || '')) throw new Error('Supply the authorised canonical contract file and its merged API commit SHA.');
const canonical = fs.readFileSync(source);
const version = JSON.parse(canonical.toString('utf8')).info?.version;
if (typeof version !== 'string' || !version) throw new Error('The canonical contract must declare its version.');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const lock = {
  source_repository: 'Ravu-Go/Ravu-API', source_commit: commit, source_path: 'openapi/admin.yaml',
  contract_version: version, source_sha256: hash(canonical), generated_sha256: hash(fs.readFileSync('src/api/generated/admin.ts')),
};
fs.writeFileSync('admin-contract.lock.json', JSON.stringify(lock, null, 2) + '\n');
