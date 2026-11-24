// One-time preparation from the authorised private API checkout; not part of build/CI.
import fs from 'node:fs';
import vm from 'node:vm';
import { PNG } from 'pngjs';
const root = process.argv[2];
if (!root) throw new Error('Supply the API checkout root containing design/archive and docs/admin/figma.');
const source = fs.readFileSync(`${root}/design/archive/build-navigation.mjs`, 'utf8');
const literal = source.match(/const paths=(\{[^\n]+\});/)[1];
const paths = vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 100 });
paths.check = '<path d="m5 12 4 4L19 6"/>';
paths.clock = '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>';
paths.menu = '<path d="M3 6h18M3 12h18M3 18h18"/>';
fs.writeFileSync('public/icons/navigation.svg', `<svg xmlns="http://www.w3.org/2000/svg">${Object.entries(paths).map(([id, shape]) => `<symbol id="${id}" viewBox="0 0 24 24">${shape}</symbol>`).join('')}</svg>\n`);
const reference = PNG.sync.read(fs.readFileSync(`${root}/docs/admin/figma/A01.png`));
const cropped = new PNG({ width: 1440, height: 1000 });
PNG.bitblt(reference, cropped, 0, 42, 1440, 1000, 0, 0);
for (let y = 176; y < 964; y++) for (let x = 224; x < 1440; x++) {
  const i = (y * 1440 + x) * 4;
  cropped.data[i] = 245; cropped.data[i+1] = 247; cropped.data[i+2] = 252; cropped.data[i+3] = 255;
}
fs.writeFileSync('tests/visual/a01-chrome.png', PNG.sync.write(cropped));
