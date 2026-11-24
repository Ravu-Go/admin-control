// One-time preparation from the authorised private API checkout; not part of build/CI.
import fs from 'node:fs';
import vm from 'node:vm';
const root = process.argv[2];
if (!root) throw new Error('Supply the API checkout root containing design/archive design archive.');
const source = fs.readFileSync(`${root}/design/archive/build-navigation.mjs`, 'utf8');
const literal = source.match(/const paths=(\{[^\n]+\});/)[1];
const paths = vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 100 });
paths.check = '<path d="m5 12 4 4L19 6"/>';
paths.clock = '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>';
paths.menu = '<path d="M3 6h18M3 12h18M3 18h18"/>';
fs.writeFileSync('public/icons/navigation.svg', `<svg xmlns="http://www.w3.org/2000/svg">${Object.entries(paths).map(([id, shape]) => `<symbol id="${id}" viewBox="0 0 24 24">${shape}</symbol>`).join('')}</svg>\n`);
